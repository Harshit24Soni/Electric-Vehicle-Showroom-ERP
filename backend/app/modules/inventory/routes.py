from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

from app.modules.inventory import pricing_services, purchase_history_service, schemas_stock, services, services_stock
from app.modules.inventory.routes_tags import router as tags_router
from app.modules.inventory.schemas import (
    VehicleMovementCreate,
    SpareMovementCreate,
    VehicleMovementResponse,
    SpareMovementResponse,
    SpareStockResponse,
    SpareMasterResponse,
    SpareMasterCreate,
    SpareMasterUpdate,
    SparePartCodeCreate,
    SparePartVehicleCompatibilityCreate,
    PriceListResponse,
    PriceListCreate,
    PriceListVersionResponse,
    PriceListVersionCreate,
    SpareCostHistoryResponse,
    SpareSellingPriceHistoryResponse,
    SpareSellingPriceCreate,
    PriceListItemResponse,
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get("/spares", response_model=list[SpareMasterResponse])
async def list_spares(
    include_deleted: bool = False,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List all spare master records."""
    return await services.list_spares(db, include_deleted=include_deleted)


@router.post("/spares", response_model=SpareMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_spare(
    data: SpareMasterCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER")),
):
    try:
        return await services.create_spare(
            db=db,
            spare_name=data.spare_name,
            initial_code=data.initial_code,
            tracking_mode=data.tracking_mode,
            category=data.category,
            remarks=data.remarks,
        )
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/spares/{spare_id}", response_model=SpareMasterResponse)
async def get_spare(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    spare = await services.get_spare(db, spare_id)
    if not spare:
        raise HTTPException(status_code=404, detail="Spare part not found")
    return spare


@router.patch("/spares/{spare_id}", response_model=SpareMasterResponse)
async def update_spare(
    spare_id: int,
    data: SpareMasterUpdate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.update_spare(
            db=db, spare_id=spare_id, spare_name=data.spare_name, category=data.category, remarks=data.remarks
        )
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/spares/{spare_id}", response_model=SpareMasterResponse)
async def deactivate_spare(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER")),
):
    try:
        return await services.deactivate_spare(db, spare_id)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/spares/{spare_id}/restore", response_model=SpareMasterResponse)
async def restore_spare(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER", "DEALER")),
):
    try:
        return await services.restore_spare(db, spare_id)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/spares/{spare_id}/codes", response_model=SpareMasterResponse)
async def add_part_code(
    spare_id: int,
    data: SparePartCodeCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.add_part_code(db, spare_id, data.code, data.reason)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/spares/{spare_id}/codes/{code_id}", response_model=SpareMasterResponse)
async def retire_part_code(
    spare_id: int,
    code_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.retire_part_code(db, spare_id, code_id)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/spares/{spare_id}/compatibilities", response_model=SpareMasterResponse)
async def add_compatibility(
    spare_id: int,
    data: SparePartVehicleCompatibilityCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.add_compatibility(db, spare_id, data.vehicle_model_id)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/spares/{spare_id}/compatibilities/{compatibility_id}", response_model=SpareMasterResponse)
async def remove_compatibility(
    spare_id: int,
    compatibility_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.remove_compatibility(db, spare_id, compatibility_id)
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/vehicle/movement",
    status_code=status.HTTP_201_CREATED,
    response_model=VehicleMovementResponse,
)
async def create_vehicle_movement(
    data: VehicleMovementCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = await services.add_vehicle_movement(
            db=db,
            chassis_no=data.chassis_no,
            movement_type=data.movement_type,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            from_location=data.from_location,
            to_location=data.to_location,
            remarks=data.remarks,
        )
        return movement
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/vehicle/{chassis_no}/availability")
async def check_vehicle_availability(
    chassis_no: str,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    available = await services.is_vehicle_available(db, chassis_no)
    return {
        "chassis_no": chassis_no,
        "is_available": available,
    }


@router.post(
    "/spare/movement",
    status_code=status.HTTP_201_CREATED,
    response_model=SpareMovementResponse,
)
async def create_spare_movement(
    data: SpareMovementCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        movement = await services.add_spare_movement(
            db=db,
            spare_id=data.spare_id,
            quantity=data.quantity,
            movement_type=data.movement_type,
            serial_id=data.serial_id,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            remarks=data.remarks,
        )
        return movement
    except services.InventoryError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/spare/{spare_id}/stock", response_model=SpareStockResponse)
async def get_spare_stock(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    stock = await services.get_spare_stock(db, spare_id)
    return {
        "spare_id": spare_id,
        "available_quantity": stock,
    }


@router.get("/dashboard/stats", response_model=schemas_stock.InventoryDashboardResponse)
async def get_inventory_dashboard(db: AsyncSession = Depends(get_db), _staff=Depends(get_current_staff)):
    return await services_stock.get_inventory_dashboard(db)


@router.get("/stock/locations", response_model=List[schemas_stock.StockByLocationResponse])
async def get_stock_by_location(
    location: Optional[str] = None, db: AsyncSession = Depends(get_db), _staff=Depends(get_current_staff)
):
    return await services_stock.get_stock_by_location(db, location)


@router.get("/stock", response_model=schemas_stock.StockListResponse)
async def list_stock(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    return await services_stock.list_stock(db, spare_id, location)


@router.get("/batches", response_model=schemas_stock.BatchListResponse)
async def list_batches(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    return await services_stock.list_batches(db, spare_id, location)


@router.get("/serials", response_model=schemas_stock.SerialListResponse)
async def list_serials(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    serial_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    return await services_stock.list_serials(db, spare_id, location, serial_number)


@router.get("/movements", response_model=schemas_stock.MovementHistoryListResponse)
async def list_movements(
    page: int = 1,
    size: int = 50,
    spare_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    return await services_stock.list_movements(db, page, size, spare_id)


@router.post("/pricing/price-lists", response_model=PriceListResponse, status_code=status.HTTP_201_CREATED)
async def create_price_list_api(
    data: PriceListCreate, db: AsyncSession = Depends(get_db), _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    pl = await pricing_services.create_price_list(db, source_name=data.source_name, remarks=data.remarks)
    if data.initial_version:
        await pricing_services.add_price_list_version(
            db,
            pl.price_list_id,
            version_reference=data.initial_version.version_reference,
            effective_from=data.initial_version.effective_from,
            received_date=data.initial_version.received_date,
            items_data=[item.model_dump() for item in data.initial_version.items],
        )
        # Re-fetch to get versions
        return await pricing_services.get_price_list(db, pl.price_list_id)
    return pl


@router.get("/pricing/price-lists", response_model=list[PriceListResponse])
async def list_price_lists_api(db: AsyncSession = Depends(get_db), _staff=Depends(require_roles("ADMIN", "MANAGER"))):
    return await pricing_services.list_price_lists(db)


@router.post(
    "/pricing/price-lists/{price_list_id}/versions",
    response_model=PriceListVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_price_list_version_api(
    price_list_id: int,
    data: PriceListVersionCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await pricing_services.add_price_list_version(
            db,
            price_list_id,
            version_reference=data.version_reference,
            effective_from=data.effective_from,
            received_date=data.received_date,
            items_data=[item.model_dump() for item in data.items],
        )
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post(
    "/spares/{spare_id}/selling-price",
    response_model=SpareSellingPriceHistoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_spare_selling_price_api(
    spare_id: int,
    data: SpareSellingPriceCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    return await pricing_services.add_spare_selling_price(
        db, spare_id, selling_price=data.selling_price, reason=data.reason
    )


@router.get("/spares/{spare_id}/pricing", response_model=dict)
async def get_spare_pricing_summary(
    spare_id: int, db: AsyncSession = Depends(get_db), _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    margin_data = await pricing_services.calculate_margin(db, spare_id)
    return margin_data


@router.get("/spares/{spare_id}/price-history", response_model=list[PriceListItemResponse])
async def get_spare_price_history_api(
    spare_id: int, db: AsyncSession = Depends(get_db), _staff=Depends(get_current_staff)
):
    return await pricing_services.get_price_history(db, spare_id)


@router.get("/spares/{spare_id}/cost-history", response_model=list[SpareCostHistoryResponse])
async def get_spare_cost_history_api(
    spare_id: int, db: AsyncSession = Depends(get_db), _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    return await pricing_services.get_cost_history(db, spare_id)


@router.get("/spares/{spare_id}/selling-price-history", response_model=list[SpareSellingPriceHistoryResponse])
async def get_spare_selling_price_history_api(
    spare_id: int, db: AsyncSession = Depends(get_db), _staff=Depends(get_current_staff)
):
    return await pricing_services.get_selling_price_history(db, spare_id)


@router.get("/spares/{spare_id}/purchase-history", response_model=purchase_history_service.PartPurchaseSummaryResponse)
async def get_spare_purchase_history_api(
    spare_id: int, db: AsyncSession = Depends(get_db), _staff=Depends(get_current_staff)
):
    """Retrieve full purchase bill and rate summary for a spare by ID."""
    return await purchase_history_service.get_part_purchase_history(db, str(spare_id))


# ==============================================================================
# PRICING ALERTS & RISK MANAGEMENT
# ==============================================================================


@router.get("/pricing/alerts")
@router.get("/pricing-alerts")
async def list_pricing_alerts_api(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    spare_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List pricing and profit risk alerts with optional filtering."""
    from sqlalchemy import select
    from app.modules.inventory.models import PricingAlert

    stmt = select(PricingAlert).where(PricingAlert.is_deleted.is_(False))
    if severity:
        stmt = stmt.where(PricingAlert.severity == severity)
    if status:
        stmt = stmt.where(PricingAlert.status == status)
    if spare_id:
        stmt = stmt.where(PricingAlert.spare_id == spare_id)
    stmt = stmt.order_by(PricingAlert.updated_at.desc())

    alerts = (await db.execute(stmt)).scalars().all()
    return alerts


@router.post("/pricing-alerts/{alert_id}/acknowledge")
async def acknowledge_pricing_alert_api(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Acknowledge an open pricing risk alert."""
    from datetime import datetime, timezone
    from app.modules.inventory.models import PricingAlert, AlertStatus

    stmt = select(PricingAlert).where(PricingAlert.alert_id == alert_id).with_for_update()
    alert = (await db.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )
    alert.status = AlertStatus.ACKNOWLEDGED.value
    alert.acknowledged_by = staff_id
    alert.acknowledged_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return {"message": "Alert acknowledged", "alert_id": alert_id}


@router.post("/pricing-alerts/{alert_id}/resolve")
async def resolve_pricing_alert_api(
    alert_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(get_current_staff),
):
    """Resolve an open or acknowledged pricing risk alert with an explanation."""
    from datetime import datetime, timezone
    from app.modules.inventory.models import PricingAlert, AlertStatus

    stmt = select(PricingAlert).where(PricingAlert.alert_id == alert_id).with_for_update()
    alert = (await db.execute(stmt)).scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    reason = payload.get("reason", "Manually resolved by staff")
    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    alert.status = AlertStatus.RESOLVED.value
    alert.resolved_by = staff_id
    alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    alert.resolution_reason = reason
    await db.commit()
    return {"message": "Alert resolved", "alert_id": alert_id}


# ==============================================================================
# LOSS EXCEPTIONS
# ==============================================================================


@router.post("/loss-exceptions")
async def create_loss_exception_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    """Authorize an explicit, auditable exception allowing a negative-profit transaction."""
    from app.modules.inventory.models import LossSaleException

    spare_id = payload.get("spare_id")
    part_code = payload.get("part_code")
    quantity = payload.get("quantity", 1)
    expected_revenue = payload.get("expected_revenue", 0.0)
    expected_cost = payload.get("expected_cost", 0.0)
    expected_loss = payload.get("expected_loss", 0.0)
    expected_margin = payload.get("expected_margin", 0.0)
    reason = payload.get("reason")
    requested_by = payload.get("requested_by_staff_id")

    authorizer_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    if not spare_id or not part_code or not reason:
        raise HTTPException(status_code=400, detail="spare_id, part_code, and reason are required.")

    if requested_by and authorizer_id == requested_by:
        raise HTTPException(status_code=403, detail="Staff cannot authorize their own loss exception.")

    exc = LossSaleException(
        spare_id=spare_id,
        part_code=part_code,
        quantity=quantity,
        requested_by_staff_id=requested_by or authorizer_id,
        authorized_by_staff_id=authorizer_id,
        expected_revenue=expected_revenue,
        expected_cost=expected_cost,
        expected_loss=expected_loss,
        expected_margin=expected_margin,
        reason=reason,
    )
    db.add(exc)
    await db.commit()
    await db.refresh(exc)
    return {"message": "Loss exception authorized", "exception_id": exc.exception_id}


# ==============================================================================
# PRICE & COST AUDIT TRAIL
# ==============================================================================


@router.get("/price-audit-events")
async def list_price_audit_events_api(
    spare_id: Optional[int] = Query(None),
    change_type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List immutable timestamped price and cost change audit events."""
    from sqlalchemy import select
    from app.modules.inventory.models import PriceChangeAuditEvent

    stmt = select(PriceChangeAuditEvent)
    if spare_id:
        stmt = stmt.where(PriceChangeAuditEvent.spare_id == spare_id)
    if change_type:
        stmt = stmt.where(PriceChangeAuditEvent.change_type == change_type)
    stmt = stmt.order_by(PriceChangeAuditEvent.effective_timestamp.desc(), PriceChangeAuditEvent.event_id.desc())

    events = (await db.execute(stmt)).scalars().all()
    return events


# ==============================================================================
# DISCOUNT RULES & EVALUATION
# ==============================================================================


@router.get("/discount-rules")
async def list_discount_rules_api(
    target_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """List supplier or customer discount rules."""
    from sqlalchemy import select
    from app.modules.inventory.models import DiscountRule

    stmt = select(DiscountRule).where(DiscountRule.is_deleted.is_(False))
    if target_type:
        stmt = stmt.where(DiscountRule.target_type == target_type)
    if is_active is not None:
        stmt = stmt.where(DiscountRule.is_active == is_active)
    stmt = stmt.order_by(DiscountRule.priority.desc(), DiscountRule.rule_id.asc())

    rules = (await db.execute(stmt)).scalars().all()
    return rules


@router.post("/discount-rules")
async def create_discount_rule_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    """Create a new supplier or customer discount rule."""
    from app.modules.inventory.models import DiscountRule

    staff_id = (
        current_staff.get("staff_id") if isinstance(current_staff, dict) else getattr(current_staff, "staff_id", None)
    )

    rule = DiscountRule(
        rule_name=payload.get("rule_name", "Discount Rule"),
        target_type=payload.get("target_type", "CUSTOMER"),
        discount_type=payload.get("discount_type", "PERCENTAGE"),
        discount_value=payload.get("discount_value", 0.0),
        applicable_entity_id=payload.get("applicable_entity_id"),
        spare_id=payload.get("spare_id"),
        vehicle_model_id=payload.get("vehicle_model_id"),
        min_quantity=payload.get("min_quantity", 0),
        min_basket_value=payload.get("min_basket_value", 0.0),
        threshold_is_pre_tax=payload.get("threshold_is_pre_tax", True),
        stacking_mode=payload.get("stacking_mode", "STACKABLE"),
        priority=payload.get("priority", 0),
        max_discount_amount=payload.get("max_discount_amount"),
        start_date=payload.get("start_date"),
        expiry_date=payload.get("expiry_date"),
        is_active=payload.get("is_active", True),
        created_by_staff_id=staff_id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"message": "Discount rule created", "rule_id": rule.rule_id}


@router.post("/evaluate-discounts")
async def evaluate_discounts_api(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    """Preview discount application and tax breakdown for invoice lines."""
    from app.modules.inventory import discount_engine

    target_type = payload.get("target_type", "CUSTOMER")
    lines = payload.get("lines", [])
    entity_id = payload.get("entity_id")

    results = await discount_engine.evaluate_applicable_discounts(
        db=db,
        target_type=target_type,
        lines=lines,
        entity_id=entity_id,
    )
    return {"evaluated_lines": results}


router.include_router(tags_router)
