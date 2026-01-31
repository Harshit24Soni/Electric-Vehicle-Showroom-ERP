from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional


from app.db.session import get_db
from app.auth.dependencies import get_current_staff
from app.domains.sales.schemas import VehicleSaleCreate, VehicleDeliveryConfirm
from app.domains.sales import services
from app.domains.sales.models import VehicleSale

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.post("/vehicle/book", status_code=status.HTTP_201_CREATED)
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
        return {
            "sale_id": sale.sale_id,
            "status": sale.sale_status,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/vehicle/{sale_id}/deliver")
def deliver_vehicle(
    sale_id: int,
    data: VehicleDeliveryConfirm,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    sale = db.get(VehicleSale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    services.confirm_vehicle_delivery(
        db=db,
        sale=sale,
        remarks=data.remarks,
    )

    return {"message": "Vehicle delivered successfully"}

@router.get("/vehicle")
def list_sales(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _staff=Depends(get_current_staff),
):
    sales = services.list_vehicle_sales(
        db=db,
        status=status,
    )

    return [
        {
            "sale_id": s.sale_id,
            "lead_id": s.lead_id,
            "chassis_no": s.chassis_no,
            "sale_status": s.sale_status,
            "booking_amount": float(s.booking_amount),
            "created_at": s.created_at,
            "delivered_at": s.delivered_at,
        }
        for s in sales
    ]

@router.get("/vehicle/{sale_id}")
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
        raise HTTPException(status_code=404, detail="Sale not found")

    return {
        "sale_id": sale.sale_id,
        "lead_id": sale.lead_id,
        "chassis_no": sale.chassis_no,
        "sale_status": sale.sale_status,
        "booking_amount": float(sale.booking_amount),
        "created_at": sale.created_at,
        "delivered_at": sale.delivered_at,
        "remarks": sale.remarks,
        "vehicle_available": available,
    }
