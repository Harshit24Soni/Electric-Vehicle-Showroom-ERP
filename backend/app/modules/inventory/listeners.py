import logging
from contextlib import asynccontextmanager

from app.core.event_bus import (
    event_bus, 
    SparePurchasedEvent, 
    SpareConsumedEvent, 
    VehicleIntakeEvent, 
    VehicleDeliveredEvent,
    DefectiveSpareReturnedEvent,
    WarrantyReplacementIssuedEvent,
    SparePriceUpdatedEvent
)
from app.modules.inventory.services import add_spare_movement, add_vehicle_movement, create_temporary_spare

# Decoupling Strategy (DDD Phase 1 & 4):
# Listeners subscribe to cross-module events on the global Event Bus. 
# They act as the asynchronous "entry points" for write operations triggered by 
# external domains (like Service, Procurement, Warranty). The external domains do NOT 
# call Inventory services or databases directly.

logger = logging.getLogger(__name__)

@asynccontextmanager
async def get_async_session():
    """
    Mock async session generator for the background listener tasks.
    In a real application, you would import your SessionLocal or async_sessionmaker 
    from app.db.session.
    """
    yield None  # Mock yield for this example

async def handle_spare_purchased(event: SparePurchasedEvent) -> None:
    logger.info(f"Inventory module handling SparePurchasedEvent for spare {event.spare_id}")
    async with get_async_session() as db:
        if db is not None:
            await add_spare_movement(
                db,
                spare_id=event.spare_id,
                quantity=abs(event.quantity),
                movement_type="PURCHASE",
                reference_type="PROCUREMENT",
                remarks="System auto-added from SparePurchasedEvent"
            )
            await db.commit()

async def handle_spare_consumed(event: SpareConsumedEvent) -> None:
    logger.info(f"Inventory module handling SpareConsumedEvent for spare {event.spare_id}")
    async with get_async_session() as db:
        if db is not None:
            await add_spare_movement(
                db,
                spare_id=event.spare_id,
                quantity=-abs(event.quantity),
                movement_type="SERVICE_CONSUMPTION",
                reference_type=event.reference_type,
                reference_id=event.reference_id,
                remarks="System auto-consumed from SpareConsumedEvent"
            )
            await db.commit()

async def handle_vehicle_intake(event: VehicleIntakeEvent) -> None:
    logger.info(f"Inventory module handling VehicleIntakeEvent for chassis {event.chassis_no}")
    async with get_async_session() as db:
        if db is not None:
            await add_vehicle_movement(
                db,
                chassis_no=event.chassis_no,
                movement_type="INWARD",
                reference_type="PROCUREMENT",
                reference_id=event.reference_id,
                remarks=f"OEM Intake — Invoice {event.invoice_no}"
            )
            await db.commit()

async def handle_vehicle_delivered(event: VehicleDeliveredEvent) -> None:
    logger.info(f"Inventory module handling VehicleDeliveredEvent for chassis {event.chassis_no}")
    async with get_async_session() as db:
        if db is not None:
            await add_vehicle_movement(
                db,
                chassis_no=event.chassis_no,
                movement_type="DELIVERED",
                from_location="SHOWROOM",
                to_location="CUSTOMER",
                reference_type="SALE",
                reference_id=event.sale_id,
                remarks=f"Sale #{event.sale_id} — {event.invoice_no}"
            )
            await db.commit()

async def handle_defective_returned(event: DefectiveSpareReturnedEvent) -> None:
    logger.info(f"Inventory module handling DefectiveSpareReturnedEvent for spare {event.spare_id}")
    async with get_async_session() as db:
        if db is not None:
            await add_spare_movement(
                db,
                spare_id=event.spare_id,
                quantity=1,
                movement_type="WARRANTY_INWARD",
                reference_type="SERVICE",
                reference_id=event.job_card_id,
                serial_id=event.serial_id,
                remarks="Defective component recovered via warranty swap"
            )
            await db.commit()

async def handle_warranty_issued(event: WarrantyReplacementIssuedEvent) -> None:
    logger.info(f"Inventory module handling WarrantyReplacementIssuedEvent for spare {event.spare_id}")
    async with get_async_session() as db:
        if db is not None:
            await add_spare_movement(
                db,
                spare_id=event.spare_id,
                quantity=-1,
                movement_type="WARRANTY_OUTWARD",
                reference_type="SERVICE",
                reference_id=event.job_card_id,
                serial_id=event.serial_id,
                remarks="Replacement component issued via warranty swap"
            )
            await db.commit()

async def handle_spare_price_updated(event: SparePriceUpdatedEvent) -> None:
    logger.info(f"Inventory module acknowledged price update for spare {event.spare_id}")
    # Future extension: Update SpareMaster cached prices here

def register_inventory_listeners():
    """
    Register all inventory event handlers with the global Event Bus.
    Call this function during application startup (e.g., in main.py).
    """
    event_bus.subscribe(SparePurchasedEvent, handle_spare_purchased)
    event_bus.subscribe(SpareConsumedEvent, handle_spare_consumed)
    event_bus.subscribe(VehicleIntakeEvent, handle_vehicle_intake)
    event_bus.subscribe(VehicleDeliveredEvent, handle_vehicle_delivered)
    event_bus.subscribe(DefectiveSpareReturnedEvent, handle_defective_returned)
    event_bus.subscribe(WarrantyReplacementIssuedEvent, handle_warranty_issued)
    event_bus.subscribe(SparePriceUpdatedEvent, handle_spare_price_updated)
    logger.info("Inventory module event listeners registered successfully.")
