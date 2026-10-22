import logging
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload

from app.modules.sales.models import SpareSale, SpareSaleItem
from app.modules.sales.schemas_spare import SpareSaleCreate
from app.modules.inventory.models import SpareStockBalance, SpareBatch, SpareSerial, SpareMaster
from app.modules.inventory.services import add_spare_movement

logger = logging.getLogger(__name__)


class SpareSaleError(Exception):
    pass


async def list_spare_sales(db: AsyncSession) -> List[SpareSale]:
    """Retrieve all spare sales ordered by sale ID descending."""
    stmt = select(SpareSale).options(joinedload(SpareSale.items)).order_by(SpareSale.sale_id.desc())
    result = await db.execute(stmt)
    return list(result.unique().scalars().all())


async def get_spare_sale(db: AsyncSession, sale_id: int) -> Optional[SpareSale]:
    """Retrieve a single spare sale by its ID."""
    stmt = select(SpareSale).options(joinedload(SpareSale.items)).where(SpareSale.sale_id == sale_id)
    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()


async def create_draft_sale(db: AsyncSession, payload: SpareSaleCreate, staff_id: int) -> SpareSale:
    """Create a draft spare sale and items with atomic transactional protection."""
    try:
        subtotal = Decimal("0.0")
        total_discount = Decimal("0.0")
        total_tax = Decimal("0.0")

        sale_items = []
        for item in payload.items:
            line_tot = (item.unit_selling_price * item.quantity) - item.discount + item.tax

            sale_items.append(
                SpareSaleItem(
                    spare_id=item.spare_id,
                    part_code=item.part_code,
                    spare_name=item.spare_name,
                    tracking_mode=item.tracking_mode,
                    batch_id=item.batch_id,
                    serial_id=item.serial_id,
                    quantity=item.quantity,
                    unit_selling_price=item.unit_selling_price,
                    discount=item.discount,
                    tax=item.tax,
                    line_total=line_tot,
                )
            )
            subtotal += item.unit_selling_price * item.quantity
            total_discount += item.discount
            total_tax += item.tax

        grand_total = subtotal - total_discount + total_tax

        sale = SpareSale(
            customer_id=payload.customer_id,
            status="DRAFT",
            subtotal=subtotal,
            discount=total_discount,
            tax=total_tax,
            grand_total=grand_total,
            remarks=payload.remarks,
            created_by_staff_id=staff_id,
            items=sale_items,
        )

        db.add(sale)
        await db.commit()
        await db.refresh(sale)
        return await get_spare_sale(db, sale.sale_id)
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to create draft spare sale: %s", exc, exc_info=True)
        raise


async def confirm_sale(
    db: AsyncSession,
    sale_id: int,
    staff_id: int,
    exception_id: Optional[int] = None,
) -> SpareSale:
    """Confirm a draft spare sale, atomically validating stock, profitability, and deducting inventory."""
    try:
        sale = await get_spare_sale(db, sale_id)
        if not sale:
            raise SpareSaleError("Sale not found")
        if sale.status != "DRAFT":
            raise SpareSaleError(f"Sale is in {sale.status} state, cannot confirm.")

        total_taxable_rev = Decimal("0.00")
        total_output_gst = Decimal("0.00")

        # Atomic validation, COGS snapshotting, and stock movement
        for item in sale.items:
            # Query SpareMaster for canonical cost and pricing
            stmt_spare = select(SpareMaster).where(SpareMaster.spare_id == item.spare_id).with_for_update()
            spare = (await db.execute(stmt_spare)).scalar_one_or_none()
            wac_cost = Decimal(str(spare.accounting_wac or spare.base_cost or 0.0)) if spare else Decimal("0.00")
            gst_rate = Decimal(str(spare.gst_rate or 18.0)) if spare else Decimal("18.00")

            # Check stock balance
            stmt = select(SpareStockBalance).where(SpareStockBalance.spare_id == item.spare_id).with_for_update()
            balance = (await db.execute(stmt)).scalar_one_or_none()
            if not balance or balance.quantity < item.quantity:
                raise SpareSaleError(f"Insufficient stock for spare_id {item.spare_id}")

            # Enforce Profitability Guardrails & Legal Revised MRP Ceiling
            from app.modules.inventory.profitability_service import (
                validate_sale_profitability,
                ProfitabilityValidationError,
            )

            unit_discount = (
                (Decimal(str(item.discount)) / Decimal(str(item.quantity))).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                if item.quantity and item.discount
                else Decimal("0.00")
            )

            try:
                profit_info = await validate_sale_profitability(
                    db=db,
                    spare_id=item.spare_id,
                    proposed_unit_price=item.unit_selling_price,
                    quantity=item.quantity,
                    unit_discount=unit_discount,
                    gst_rate=gst_rate,
                    exception_id=exception_id,
                    requesting_staff_id=staff_id,
                )
            except ProfitabilityValidationError as val_err:
                raise SpareSaleError(str(val_err)) from val_err

            # Snapshot true perpetual WAC cost
            item.unit_cost = wac_cost

            # Deduct standard quantity balance
            balance.quantity -= item.quantity

            if item.tracking_mode == "BATCH":
                if not item.batch_id:
                    raise SpareSaleError("Batch ID is required for BATCH tracked spare.")
                stmt = (
                    select(SpareBatch)
                    .where(and_(SpareBatch.batch_id == item.batch_id, SpareBatch.status == "ACTIVE"))
                    .with_for_update()
                )
                batch = (await db.execute(stmt)).scalar_one_or_none()
                if not batch or batch.available_quantity < item.quantity:
                    raise SpareSaleError(f"Insufficient quantity in batch {item.batch_id}")
                batch.available_quantity -= item.quantity
                if batch.unit_cost:
                    item.unit_cost = batch.unit_cost

            elif item.tracking_mode == "SERIALIZED":
                if not item.serial_id:
                    raise SpareSaleError("Serial ID is required for SERIALIZED spare.")
                if item.quantity != 1:
                    raise SpareSaleError("Quantity must be 1 for a single serialized item.")
                stmt = (
                    select(SpareSerial)
                    .where(and_(SpareSerial.serial_id == item.serial_id, SpareSerial.status == "IN_STOCK"))
                    .with_for_update()
                )
                serial = (await db.execute(stmt)).scalar_one_or_none()
                if not serial:
                    raise SpareSaleError(f"Serial {item.serial_id} is not in stock or does not exist.")
                serial.status = "SOLD"
                if serial.unit_cost:
                    item.unit_cost = serial.unit_cost

            await add_spare_movement(
                db=db,
                movement_type="SALE",
                reference_type="SALE",
                reference_id=sale.sale_id,
                spare_id=item.spare_id,
                quantity=-item.quantity,
                serial_id=item.serial_id,
                remarks=f"Sale #{sale.sale_id} Confirmation",
            )

            total_taxable_rev += Decimal(str(profit_info["net_sales_revenue"]))
            total_output_gst += Decimal(str(profit_info["output_gst_per_unit"])) * item.quantity

        sale.status = "CONFIRMED"
        sale.invoice_number = f"INV-SP-{sale.sale_id:06d}"

        # Record Output GST liability in the GST Ledger
        from app.modules.finance.gst_service import record_sale_output_tax

        cgst_part = (total_output_gst / Decimal("2.00")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        sgst_part = total_output_gst - cgst_part

        await record_sale_output_tax(
            db=db,
            sale_id=sale.sale_id,
            invoice_number=sale.invoice_number,
            invoice_date=sale.sale_date or date.today(),
            taxable_value=total_taxable_rev,
            cgst_amount=cgst_part,
            sgst_amount=sgst_part,
            igst_amount=Decimal("0.00"),
            customer_name=None,
        )

        await db.commit()
        return await get_spare_sale(db, sale.sale_id)
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to confirm spare sale %s: %s", sale_id, exc, exc_info=True)
        raise


async def cancel_sale(db: AsyncSession, sale_id: int, staff_id: int) -> SpareSale:
    """Cancel a sale, rolling back inventory balances, batches, serials, and reversing output tax if previously confirmed."""
    try:
        sale = await get_spare_sale(db, sale_id)
        if not sale:
            raise SpareSaleError("Sale not found")

        if sale.status == "CANCELLED":
            raise SpareSaleError("Sale is already cancelled")

        if sale.status == "DRAFT":
            sale.status = "CANCELLED"
            await db.commit()
            return sale

        # If confirmed, reverse the stock movements
        if sale.status == "CONFIRMED":
            for item in sale.items:
                # Revert batches and serials
                if item.tracking_mode == "BATCH":
                    stmt = select(SpareBatch).where(SpareBatch.batch_id == item.batch_id).with_for_update()
                    batch = (await db.execute(stmt)).scalar_one_or_none()
                    if batch:
                        batch.available_quantity += item.quantity
                elif item.tracking_mode == "SERIALIZED":
                    stmt = select(SpareSerial).where(SpareSerial.serial_id == item.serial_id).with_for_update()
                    serial = (await db.execute(stmt)).scalar_one_or_none()
                    if serial:
                        serial.status = "IN_STOCK"

                # Update stock balance
                stmt_balance = (
                    select(SpareStockBalance).where(SpareStockBalance.spare_id == item.spare_id).with_for_update()
                )
                balance = (await db.execute(stmt_balance)).scalar_one_or_none()
                if balance:
                    balance.quantity += item.quantity
                else:
                    balance = SpareStockBalance(spare_id=item.spare_id, location="MAIN", quantity=item.quantity)
                    db.add(balance)

                await add_spare_movement(
                    db=db,
                    movement_type="ADJUSTMENT",
                    reference_type="SALE",
                    reference_id=sale.sale_id,
                    spare_id=item.spare_id,
                    quantity=item.quantity,
                    serial_id=item.serial_id,
                    remarks=f"Sale #{sale.sale_id} Cancellation",
                )

            # Reverse Output GST Liability in the GST Ledger
            from app.modules.finance.models import OutputTaxRecord, OutputTaxStatus

            out_stmt = select(OutputTaxRecord).where(OutputTaxRecord.sale_id == sale.sale_id).with_for_update()
            out_rec = (await db.execute(out_stmt)).scalar_one_or_none()
            if out_rec:
                out_rec.status = OutputTaxStatus.REVERSED.value

            sale.status = "CANCELLED"
            await db.commit()
            return await get_spare_sale(db, sale.sale_id)
    except Exception as exc:
        await db.rollback()
        logger.error("Failed to cancel spare sale %s: %s", sale_id, exc, exc_info=True)
        raise
