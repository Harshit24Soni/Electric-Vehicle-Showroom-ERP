from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional


from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.sales.schemas import (
    VehicleSaleCreate,
    VehicleDeliveryConfirm,
    VehicleSaleListItem,
    VehicleSaleDetail,
)
from app.domains.sales import services
from app.domains.sales.models import VehicleSale


router = APIRouter(prefix="/sales", tags=["Sales"])


@router.post("/vehicle/book", status_code=status.HTTP_201_CREATED, response_model=VehicleSaleListItem)
def book_vehicle(
    data: VehicleSaleCreate,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        sale = services.create_vehicle_sale(
            db=db,
            lead_id=data.lead_id,
            chassis_no=data.chassis_no,
            booking_amount=data.booking_amount,
            remarks=data.remarks,
        )
        return sale
    except services.SaleError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/vehicle/{sale_id}/deliver", status_code=status.HTTP_200_OK)
def deliver_vehicle(
    sale_id: int,
    data: VehicleDeliveryConfirm,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    sale = db.get(VehicleSale, sale_id)
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    try:
        services.confirm_vehicle_delivery(
            db=db,
            sale=sale,
            remarks=data.remarks,
        )
        return {"message": "Vehicle delivered successfully"}
    except services.SaleError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/vehicle", response_model=list[VehicleSaleListItem])
def list_sales(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    sales = services.list_vehicle_sales(
        db=db,
        status=status,
    )

    return sales


@router.get("/vehicle/{sale_id}", response_model=VehicleSaleDetail)
def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    try:
        sale, available = services.get_vehicle_sale_detail(
            db=db,
            sale_id=sale_id,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    # augment object with derived attribute for pydantic
    setattr(sale, "vehicle_available", available)

    return sale
