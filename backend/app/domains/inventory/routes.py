from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.auth.roles import require_roles

from app.domains.inventory import services
from app.domains.inventory.schemas import (
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
from app.domains.inventory import pricing_services

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


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
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.create_spare(
            db=db,
            spare_name=data.spare_name,
            initial_code=data.initial_code,
            tracking_mode=data.tracking_mode,
            category=data.category,
            remarks=data.remarks
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
            db=db,
            spare_id=spare_id,
            spare_name=data.spare_name,
            category=data.category,
            remarks=data.remarks
        )
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/spares/{spare_id}", response_model=SpareMasterResponse)
async def deactivate_spare(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER")),
):
    try:
        return await services.deactivate_spare(db, spare_id)
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

from app.domains.inventory import schemas_stock, services_stock
from typing import List, Optional

@router.get("/dashboard/stats", response_model=schemas_stock.InventoryDashboardResponse)
async def get_inventory_dashboard(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.get_inventory_dashboard(db)

@router.get("/stock/locations", response_model=List[schemas_stock.StockByLocationResponse])
async def get_stock_by_location(
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.get_stock_by_location(db, location)

@router.get("/stock", response_model=schemas_stock.StockListResponse)
async def list_stock(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.list_stock(db, spare_id, location)

@router.get("/batches", response_model=schemas_stock.BatchListResponse)
async def list_batches(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.list_batches(db, spare_id, location)

@router.get("/serials", response_model=schemas_stock.SerialListResponse)
async def list_serials(
    spare_id: Optional[int] = None,
    location: Optional[str] = None,
    serial_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.list_serials(db, spare_id, location, serial_number)

@router.get("/movements", response_model=schemas_stock.MovementHistoryListResponse)
async def list_movements(
    page: int = 1,
    size: int = 50,
    spare_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await services_stock.list_movements(db, page, size, spare_id)



@router.post("/pricing/price-lists", response_model=PriceListResponse, status_code=status.HTTP_201_CREATED)
async def create_price_list_api(
    data: PriceListCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    pl = await pricing_services.create_price_list(db, source_name=data.source_name, remarks=data.remarks)
    if data.initial_version:
        await pricing_services.add_price_list_version(
            db,
            pl.price_list_id,
            version_reference=data.initial_version.version_reference,
            effective_from=data.initial_version.effective_from,
            received_date=data.initial_version.received_date,
            items_data=[item.model_dump() for item in data.initial_version.items]
        )
        # Re-fetch to get versions
        return await pricing_services.get_price_list(db, pl.price_list_id)
    return pl

@router.get("/pricing/price-lists", response_model=list[PriceListResponse])
async def list_price_lists_api(
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    return await pricing_services.list_price_lists(db)

@router.post("/pricing/price-lists/{price_list_id}/versions", response_model=PriceListVersionResponse, status_code=status.HTTP_201_CREATED)
async def add_price_list_version_api(
    price_list_id: int,
    data: PriceListVersionCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    try:
        return await pricing_services.add_price_list_version(
            db,
            price_list_id,
            version_reference=data.version_reference,
            effective_from=data.effective_from,
            received_date=data.received_date,
            items_data=[item.model_dump() for item in data.items]
        )
    except services.InventoryError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/spares/{spare_id}/selling-price", response_model=SpareSellingPriceHistoryResponse, status_code=status.HTTP_201_CREATED)
async def add_spare_selling_price_api(
    spare_id: int,
    data: SpareSellingPriceCreate,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    return await pricing_services.add_spare_selling_price(
        db,
        spare_id,
        selling_price=data.selling_price,
        reason=data.reason
    )

@router.get("/spares/{spare_id}/pricing", response_model=dict)
async def get_spare_pricing_summary(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    margin_data = await pricing_services.calculate_margin(db, spare_id)
    return margin_data

@router.get("/spares/{spare_id}/price-history", response_model=list[PriceListItemResponse])
async def get_spare_price_history_api(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await pricing_services.get_price_history(db, spare_id)

@router.get("/spares/{spare_id}/cost-history", response_model=list[SpareCostHistoryResponse])
async def get_spare_cost_history_api(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_roles("ADMIN", "MANAGER"))
):
    return await pricing_services.get_cost_history(db, spare_id)

@router.get("/spares/{spare_id}/selling-price-history", response_model=list[SpareSellingPriceHistoryResponse])
async def get_spare_selling_price_history_api(
    spare_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(get_current_staff)
):
    return await pricing_services.get_selling_price_history(db, spare_id)

from app.domains.inventory.routes_tags import router as tags_router
router.include_router(tags_router)
