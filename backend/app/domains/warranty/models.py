from backend.app.db.base import Base


class WarrantyClaim(Base):
    __tablename__ = "claim"
    __table_args__ = {"schema": "warranty"}
    ...

class WarrantyClaim(Base):
    __tablename__ = "claim"
    __table_args__ = {"schema": "warranty"}
    ...

class WarrantyShipment(Base):
    __tablename__ = "shipment"
    __table_args__ = {"schema": "warranty"}
    ...
