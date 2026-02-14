# EV Showroom ERP - Master Implementation Guide

**Version**: 1.0 Production-Ready  
**Last Updated**: 2026-02-12  
**Execution Mode**: Phased AI Agent Implementation  
**Total Implementation Time**: 15-20 hours across multiple phases  

---

## 📊 IMPLEMENTATION OVERVIEW

**Total Scope**:
- ✅ 80+ files to create/modify
- ✅ 15 new database tables
- ✅ 45+ new API endpoints
- ✅ 30+ React components
- ✅ Complete sales workflow redesign

**Phases**:
1. **Database & Models** (3-4 hours)
2. **Backend Services & APIs** (5-6 hours)
3. **Frontend Components** (5-6 hours)
4. **Integration & Testing** (2-3 hours)

---

## 🎯 BUSINESS FLOW SUMMARY

```
ENTRY POINTS:
├─ Lead Entry (from showroom visit)
│  └─ Auto-assigned to staff
│  └─ Smart follow-up calculation
│  └─ Test rides tracked
│  └─ Convert to Sale OR Mark Lost
│
└─ Direct Sale (walk-in purchase)
   └─ Skip lead stage entirely
   
CONVERSION/DIRECT SALE:
└─ Customer Details (Aadhaar, PAN, Nominee)
   └─ Billing (Chassis + Payments)
      └─ Documents (4 mandatory: Receipt, Invoice, Challan, Schedule)
         └─ Vehicle Delivery
            └─ Portal Work (Insurance, RTO, Subsidy, Celex)
               └─ Number Plate Ordering & Fixing
                  └─ CASE CLOSED

FOLLOW-UPS (Unified Dashboard):
├─ Lead Follow-ups
├─ Service Reminders
└─ Insurance Renewals
```

---

## PHASE 1: DATABASE & MODELS (3-4 hours)

### Step 1.1: Create Alembic Migration

```bash
cd backend
alembic revision --autogenerate -m "complete_erp_workflow_redesign"
```

### Step 1.2: Migration File Content

**File**: `backend/alembic/versions/xxxx_complete_erp_workflow_redesign.py`

**Complete Migration Code** (Copy this entire block):

```python
"""complete_erp_workflow_redesign

Revision ID: xxxx
Revises: previous_revision
Create Date: 2026-02-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'xxxx'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade():
    # ========================================================================
    # PART 1: ENHANCE LEADS TABLE
    # ========================================================================
    op.add_column('crm.leads', sa.Column('expected_purchase_days', sa.Integer(), nullable=True))
    op.add_column('crm.leads', sa.Column('next_followup_date', sa.Date(), nullable=True))
    op.add_column('crm.leads', sa.Column('assigned_staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=True))
    op.add_column('crm.leads', sa.Column('lead_status', sa.String(20), nullable=False, server_default='WARM'))
    op.add_column('crm.leads', sa.Column('preferred_model_id', sa.Integer(), sa.ForeignKey('master.vehicle_models.id'), nullable=True))
    op.add_column('crm.leads', sa.Column('visit_date', sa.DateTime(), nullable=False, server_default=sa.func.now()))
    op.add_column('crm.leads', sa.Column('is_converted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('crm.leads', sa.Column('converted_sale_id', sa.Integer(), nullable=True))
    
    # ========================================================================
    # PART 2: LEAD FOLLOWUPS
    # ========================================================================
    op.create_table(
        'lead_followups',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('crm.leads.id'), nullable=False),
        sa.Column('followup_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('remarks', sa.Text(), nullable=False),
        sa.Column('outcome_status', sa.String(20), nullable=False),
        sa.Column('next_followup_date', sa.Date(), nullable=True),
        sa.Column('staff_id', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='crm'
    )
    
    # ========================================================================
    # PART 3: TEST RIDES
    # ========================================================================
    op.create_table(
        'test_rides',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('lead_id', sa.Integer(), sa.ForeignKey('crm.leads.id'), nullable=False),
        sa.Column('vehicle_model_id', sa.Integer(), sa.ForeignKey('master.vehicle_models.id'), nullable=False),
        sa.Column('ride_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='crm'
    )
    
    # ========================================================================
    # PART 4: ENHANCE SALES TABLE
    # ========================================================================
    op.add_column('sales.sale', sa.Column('sale_stage', sa.String(50), nullable=False, server_default='ENQUIRY'))
    op.add_column('sales.sale', sa.Column('lead_id', sa.Integer(), sa.ForeignKey('crm.leads.id'), nullable=True))
    op.add_column('sales.sale', sa.Column('is_direct_sale', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('sales.sale', sa.Column('stage_updated_at', sa.DateTime(), nullable=True))
    
    # ========================================================================
    # PART 5: SALE STAGE HISTORY
    # ========================================================================
    op.create_table(
        'sale_stage_history',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sale_id', sa.Integer(), sa.ForeignKey('sales.sale.id'), nullable=False),
        sa.Column('from_stage', sa.String(50), nullable=True),
        sa.Column('to_stage', sa.String(50), nullable=False),
        sa.Column('changed_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='sales'
    )
    
    # ========================================================================
    # PART 6: SALE PAYMENTS
    # ========================================================================
    op.create_table(
        'sale_payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sale_id', sa.Integer(), sa.ForeignKey('sales.sale.id'), nullable=False),
        sa.Column('payment_type', sa.String(20), nullable=False),
        sa.Column('payment_mode', sa.String(20), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('reference_number', sa.String(100), nullable=True),
        sa.Column('payment_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('bank_name', sa.String(100), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='sales'
    )
    
    # ========================================================================
    # PART 7: SALE DOCUMENTS
    # ========================================================================
    op.create_table(
        'sale_documents',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sale_id', sa.Integer(), sa.ForeignKey('sales.sale.id'), nullable=False),
        sa.Column('document_type', sa.String(50), nullable=False),
        sa.Column('document_number', sa.String(50), nullable=False, unique=True),
        sa.Column('generated_date', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('generated_by', sa.Integer(), sa.ForeignKey('staff.id'), nullable=False),
        sa.Column('is_printed', sa.Boolean(), default=False),
        sa.Column('print_count', sa.Integer(), default=0),
        sa.Column('last_printed_at', sa.DateTime(), nullable=True),
        schema='sales'
    )
    
    # ========================================================================
    # PART 8: PORTAL TRACKING
    # ========================================================================
    op.create_table(
        'sale_portal_tracking',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('sale_id', sa.Integer(), sa.ForeignKey('sales.sale.id'), nullable=False, unique=True),
        sa.Column('insurance_status', sa.String(20), nullable=False, default='PENDING'),
        sa.Column('insurance_completed_date', sa.DateTime(), nullable=True),
        sa.Column('insurance_policy_number', sa.String(100), nullable=True),
        sa.Column('subsidy_status', sa.String(20), nullable=False, default='PENDING'),
        sa.Column('subsidy_completed_date', sa.DateTime(), nullable=True),
        sa.Column('subsidy_reference', sa.String(100), nullable=True),
        sa.Column('rto_status', sa.String(20), nullable=False, default='PENDING'),
        sa.Column('rto_completed_date', sa.DateTime(), nullable=True),
        sa.Column('registration_number', sa.String(20), nullable=True, unique=True),
        sa.Column('celex_status', sa.String(20), nullable=False, default='PENDING'),
        sa.Column('celex_completed_date', sa.DateTime(), nullable=True),
        sa.Column('number_plate_ordered_date', sa.Date(), nullable=True),
        sa.Column('number_plate_fixed_date', sa.Date(), nullable=True),
        sa.Column('form_20_generated', sa.Boolean(), default=False),
        sa.Column('helmet_invoice_generated', sa.Boolean(), default=False),
        sa.Column('all_portals_completed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), onupdate=sa.func.now()),
        schema='sales'
    )
    
    # ========================================================================
    # PART 9: SERVICE FOLLOWUPS
    # ========================================================================
    op.create_table(
        'service_followups',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('job_card_id', sa.Integer(), sa.ForeignKey('service.job_cards.id'), nullable=False),
        sa.Column('service_type', sa.String(50), nullable=False),
        sa.Column('next_service_date', sa.Date(), nullable=False),
        sa.Column('km_at_service', sa.Integer(), nullable=True),
        sa.Column('next_service_km', sa.Integer(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), default=False),
        sa.Column('completed_date', sa.DateTime(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='service'
    )
    
    # ========================================================================
    # PART 10: INSURANCE FOLLOWUPS
    # ========================================================================
    op.create_table(
        'insurance_followups',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('insurance.policies.id'), nullable=False),
        sa.Column('renewal_date', sa.Date(), nullable=False),
        sa.Column('reminder_days_before', sa.Integer(), default=30),
        sa.Column('is_renewed', sa.Boolean(), default=False),
        sa.Column('renewed_date', sa.DateTime(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='insurance'
    )
    
    # ========================================================================
    # PART 11: UNIFIED FOLLOWUP VIEW
    # ========================================================================
    op.execute("""
        CREATE MATERIALIZED VIEW followup_aggregated_view AS
        SELECT 
            'LEAD' as followup_type,
            l.id as entity_id,
            l.name as entity_name,
            l.phone as contact_phone,
            l.next_followup_date as followup_date,
            l.assigned_staff_id as staff_id,
            l.lead_status as status,
            NULL::jsonb as details
        FROM crm.leads l
        WHERE l.next_followup_date IS NOT NULL 
          AND l.is_converted = FALSE
          AND l.lead_status NOT IN ('LOST', 'SOLD')
          AND l.deleted_at IS NULL
        
        UNION ALL
        
        SELECT
            'SERVICE' as followup_type,
            sf.job_card_id as entity_id,
            c.name as entity_name,
            c.phone as contact_phone,
            sf.next_service_date as followup_date,
            jc.assigned_technician_id as staff_id,
            CASE 
                WHEN sf.is_completed THEN 'COMPLETED'
                WHEN sf.next_service_date < CURRENT_DATE THEN 'OVERDUE'
                WHEN sf.next_service_date = CURRENT_DATE THEN 'TODAY'
                ELSE 'UPCOMING'
            END as status,
            jsonb_build_object('km', sf.next_service_km, 'type', sf.service_type) as details
        FROM service.service_followups sf
        JOIN service.job_cards jc ON jc.id = sf.job_card_id
        JOIN master.customers c ON c.id = jc.customer_id
        WHERE sf.is_completed = FALSE
        
        UNION ALL
        
        SELECT
            'INSURANCE' as followup_type,
            if.policy_id as entity_id,
            c.name as entity_name,
            c.phone as contact_phone,
            if.renewal_date as followup_date,
            p.created_by as staff_id,
            CASE
                WHEN if.is_renewed THEN 'RENEWED'
                WHEN if.renewal_date < CURRENT_DATE THEN 'EXPIRED'
                WHEN if.renewal_date = CURRENT_DATE THEN 'TODAY'
                ELSE 'UPCOMING'
            END as status,
            jsonb_build_object('policy_number', p.policy_number) as details
        FROM insurance.insurance_followups if
        JOIN insurance.policies p ON p.id = if.policy_id
        JOIN master.customers c ON c.id = p.customer_id
        WHERE if.is_renewed = FALSE;
    """)
    
    # ========================================================================
    # INDEXES FOR PERFORMANCE
    # ========================================================================
    op.create_index('idx_lead_next_followup', 'leads', ['next_followup_date'], schema='crm')
    op.create_index('idx_lead_assigned_staff', 'leads', ['assigned_staff_id'], schema='crm')
    op.create_index('idx_lead_status', 'leads', ['lead_status'], schema='crm')
    op.create_index('idx_followup_lead', 'lead_followups', ['lead_id'], schema='crm')
    op.create_index('idx_sale_stage', 'sale', ['sale_stage'], schema='sales')
    op.create_index('idx_sale_lead', 'sale', ['lead_id'], schema='sales')
    op.create_index('idx_followup_view_type', 'followup_aggregated_view', ['followup_type'])
    op.create_index('idx_followup_view_date', 'followup_aggregated_view', ['followup_date'])
    op.create_index('idx_followup_view_staff', 'followup_aggregated_view', ['staff_id'])

def downgrade():
    # Drop in reverse order
    op.execute("DROP MATERIALIZED VIEW IF EXISTS followup_aggregated_view")
    op.drop_table('insurance_followups', schema='insurance')
    op.drop_table('service_followups', schema='service')
    op.drop_table('sale_portal_tracking', schema='sales')
    op.drop_table('sale_documents', schema='sales')
    op.drop_table('sale_payments', schema='sales')
    op.drop_table('sale_stage_history', schema='sales')
    op.drop_table('test_rides', schema='crm')
    op.drop_table('lead_followups', schema='crm')
    
    # Drop added columns
    op.drop_column('sales.sale', 'stage_updated_at')
    op.drop_column('sales.sale', 'is_direct_sale')
    op.drop_column('sales.sale', 'lead_id')
    op.drop_column('sales.sale', 'sale_stage')
    op.drop_column('crm.leads', 'converted_sale_id')
    op.drop_column('crm.leads', 'is_converted')
    op.drop_column('crm.leads', 'visit_date')
    op.drop_column('crm.leads', 'preferred_model_id')
    op.drop_column('crm.leads', 'lead_status')
    op.drop_column('crm.leads', 'assigned_staff_id')
    op.drop_column('crm.leads', 'next_followup_date')
    op.drop_column('crm.leads', 'expected_purchase_days')
```

### Step 1.3: Run Migration

```bash
cd backend
alembic upgrade head
```

**Verify**: Check that all tables are created without errors.

---

### Step 1.4: Update Models

This is a CRITICAL step. You will update multiple model files with enums and relationships.

**IMPORTANT FILES TO UPDATE** (in this exact order):

1. `backend/app/domains/crm/models.py` - Add Lead enhancements
2. `backend/app/domains/sales/models.py` - Add Sale workflow
3. `backend/app/domains/followup/models.py` - CREATE NEW
4. `backend/app/domains/service/models.py` - Add followup relation
5. `backend/app/domains/insurance/models.py` - Add followup relation

Due to the massive size, I'll provide key model enhancements inline below.

---

## PHASE 2: CRITICAL BACKEND FILES (Full Code)

### File 1: Enhanced Lead Model

**File**: `backend/app/domains/crm/models.py`

**Action**: ADD these classes (keep existing code):

```python
from enum import Enum as PyEnum
from datetime import datetime, timedelta, date

class LeadStatus(str, PyEnum):
    HOT = "HOT"
    WARM = "WARM"
    COLD = "COLD"
    LOST = "LOST"
    SOLD = "SOLD"

# ENHANCE existing Lead class with these methods and properties:
class Lead(Base):
    # ... existing columns ...
    
    # NEW COLUMNS (already added via migration):
    expected_purchase_days = Column(Integer, nullable=True)
    next_followup_date = Column(Date, nullable=True, index=True)
    assigned_staff_id = Column(Integer, ForeignKey('staff.id'), nullable=True)
    lead_status = Column(String(20), nullable=False, default=LeadStatus.WARM.value)
    preferred_model_id = Column(Integer, ForeignKey('master.vehicle_models.id'), nullable=True)
    visit_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_converted = Column(Boolean, nullable=False, default=False)
    converted_sale_id = Column(Integer, nullable=True)
    
    # NEW RELATIONSHIPS:
    assigned_staff = relationship("Staff", foreign_keys=[assigned_staff_id])
    followups = relationship("LeadFollowup", back_populates="lead", cascade="all, delete-orphan")
    test_rides = relationship("TestRide", back_populates="lead", cascade="all, delete-orphan")
    
    # NEW METHODS:
    def calculate_next_followup(self):
        """Auto-calculate next followup date"""
        if self.expected_purchase_days:
            days_before = max(2, self.expected_purchase_days - 2)
            self.next_followup_date = (self.visit_date + timedelta(days=days_before)).date()
        else:
            self.next_followup_date = (datetime.utcnow() + timedelta(days=3)).date()
    
    @property
    def is_overdue(self) -> bool:
        if not self.next_followup_date:
            return False
        return self.next_followup_date < date.today()

# NEW MODEL: Lead Followup
class LeadFollowup(Base):
    __tablename__ = "lead_followups"
    __table_args__ = {'schema': 'crm'}
    
    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey('crm.leads.id'), nullable=False)
    lead = relationship("Lead", back_populates="followups")
    followup_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    remarks = Column(Text, nullable=False)  # MANDATORY
    outcome_status = Column(String(20), nullable=False)
    next_followup_date = Column(Date, nullable=True)
    staff_id = Column(Integer, ForeignKey('staff.id'), nullable=False)
    staff = relationship("Staff")
    created_at = Column(DateTime, default=datetime.utcnow)

# NEW MODEL: Test Ride
class TestRide(Base):
    __tablename__ = "test_rides"
    __table_args__ = {'schema': 'crm'}
    
    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, ForeignKey('crm.leads.id'), nullable=False)
    lead = relationship("Lead", back_populates="test_rides")
    vehicle_model_id = Column(Integer, ForeignKey('master.vehicle_models.id'), nullable=False)
    vehicle_model = relationship("VehicleModel")
    ride_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5
    created_by = Column(Integer, ForeignKey('staff.id'), nullable=False)
    created_by_staff = relationship("Staff")
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

### File 2: Sales Workflow Model

**File**: `backend/app/domains/sales/models.py`

**Action**: ADD these classes:

```python
from enum import Enum as PyEnum

class SaleStage(str, PyEnum):
    ENQUIRY = "ENQUIRY"
    FOLLOWUP = "FOLLOWUP"
    CONVERTED = "CONVERTED"
    CUSTOMER_DETAILS_COMPLETED = "CUSTOMER_DETAILS_COMPLETED"
    BILLING_STARTED = "BILLING_STARTED"
    BILLING_COMPLETED = "BILLING_COMPLETED"
    DELIVERY_READY = "DELIVERY_READY"
    DELIVERED = "DELIVERED"
    POST_DELIVERY_PENDING = "POST_DELIVERY_PENDING"
    COMPLETED = "COMPLETED"

# ENHANCE existing Sale model:
class Sale(Base):
    # ... existing columns ...
    
    # NEW COLUMNS:
    sale_stage = Column(String(50), nullable=False, default=SaleStage.ENQUIRY.value)
    stage_updated_at = Column(DateTime, nullable=True)
    lead_id = Column(Integer, ForeignKey('crm.leads.id'), nullable=True)
    is_direct_sale = Column(Boolean, nullable=False, default=False)
    
    # NEW RELATIONSHIPS:
    lead = relationship("Lead", foreign_keys=[lead_id])
    stage_history = relationship("SaleStageHistory", back_populates="sale")
    payments = relationship("SalePayment", back_populates="sale")
    documents = relationship("SaleDocument", back_populates="sale")
    portal_tracking = relationship("SalePortalTracking", back_populates="sale", uselist=False)
    
    # NEW METHOD:
    def advance_stage(self, new_stage: SaleStage, changed_by: int, remarks: str = None):
        old_stage = self.sale_stage
        self.sale_stage = new_stage.value
        self.stage_updated_at = datetime.utcnow()
        history = SaleStageHistory(
            sale_id=self.id,
            from_stage=old_stage,
            to_stage=new_stage.value,
            changed_by=changed_by,
            remarks=remarks
        )
        self.stage_history.append(history)
    
    @property
    def completion_percentage(self) -> int:
        stages = list(SaleStage)
        try:
            current_index = stages.index(SaleStage(self.sale_stage))
            return int((current_index / (len(stages) - 1)) * 100)
        except:
            return 0

# NEW MODELS:
class SaleStageHistory(Base):
    __tablename__ = "sale_stage_history"
    __table_args__ = {'schema': 'sales'}
    
    id = Column(Integer, primary_key=True)
    sale_id = Column(Integer, ForeignKey('sales.sale.id'), nullable=False)
    sale = relationship("Sale", back_populates="stage_history")
    from_stage = Column(String(50), nullable=True)
    to_stage = Column(String(50), nullable=False)
    changed_by = Column(Integer, ForeignKey('staff.id'), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SalePayment(Base):
    __tablename__ = "sale_payments"
    __table_args__ = {'schema': 'sales'}
    
    id = Column(Integer, primary_key=True)
    sale_id = Column(Integer, ForeignKey('sales.sale.id'), nullable=False)
    sale = relationship("Sale", back_populates="payments")
    payment_type = Column(String(20), nullable=False)
    payment_mode = Column(String(20), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    reference_number = Column(String(100), nullable=True)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    bank_name = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey('staff.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SaleDocument(Base):
    __tablename__ = "sale_documents"
    __table_args__ = {'schema': 'sales'}
    
    id = Column(Integer, primary_key=True)
    sale_id = Column(Integer, ForeignKey('sales.sale.id'), nullable=False)
    sale = relationship("Sale", back_populates="documents")
    document_type = Column(String(50), nullable=False)
    document_number = Column(String(50), nullable=False, unique=True)
    generated_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    generated_by = Column(Integer, ForeignKey('staff.id'), nullable=False)
    is_printed = Column(Boolean, default=False)
    print_count = Column(Integer, default=0)
    last_printed_at = Column(DateTime, nullable=True)

class SalePortalTracking(Base):
    __tablename__ = "sale_portal_tracking"
    __table_args__ = {'schema': 'sales'}
    
    id = Column(Integer, primary_key=True)
    sale_id = Column(Integer, ForeignKey('sales.sale.id'), nullable=False, unique=True)
    sale = relationship("Sale", back_populates="portal_tracking")
    insurance_status = Column(String(20), nullable=False, default='PENDING')
    insurance_completed_date = Column(DateTime, nullable=True)
    insurance_policy_number = Column(String(100), nullable=True)
    subsidy_status = Column(String(20), nullable=False, default='PENDING')
    subsidy_completed_date = Column(DateTime, nullable=True)
    rto_status = Column(String(20), nullable=False, default='PENDING')
    rto_completed_date = Column(DateTime, nullable=True)
    registration_number = Column(String(20), nullable=True)
    celex_status = Column(String(20), nullable=False, default='PENDING')
    celex_completed_date = Column(DateTime, nullable=True)
    number_plate_ordered_date = Column(Date, nullable=True)
    number_plate_fixed_date = Column(Date, nullable=True)
    form_20_generated = Column(Boolean, default=False)
    helmet_invoice_generated = Column(Boolean, default=False)
    all_portals_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

---

### File 3: Follow-up Domain (NEW)

**Create directory**: `backend/app/domains/followup/`

**File**: `backend/app/domains/followup/__init__.py` (empty)

**File**: `backend/app/domains/followup/models.py`

```python
from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime

class ServiceFollowup(Base):
    __tablename__ = "service_followups"
    __table_args__ = {'schema': 'service'}
    
    id = Column(Integer, primary_key=True)
    job_card_id = Column(Integer, ForeignKey('service.job_cards.id'), nullable=False)
    service_type = Column(String(50), nullable=False)
    next_service_date = Column(Date, nullable=False)
    km_at_service = Column(Integer, nullable=True)
    next_service_km = Column(Integer, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_date = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class InsuranceFollowup(Base):
    __tablename__ = "insurance_followups"
    __table_args__ = {'schema': 'insurance'}
    
    id = Column(Integer, primary_key=True)
    policy_id = Column(Integer, ForeignKey('insurance.policies.id'), nullable=False)
    renewal_date = Column(Date, nullable=False)
    reminder_days_before = Column(Integer, default=30)
    is_renewed = Column(Boolean, default=False)
    renewed_date = Column(DateTime, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## PHASE 3: REGISTER NEW MODELS

**File**: `backend/app/bootstrap.py`

**UPDATE** the imports section to include new models:

```python
# Existing imports...
from app.domains.crm.models import Lead, LeadFollowup, TestRide
from app.domains.sales.models import Sale, SaleStageHistory, SalePayment, SaleDocument, SalePortalTracking
from app.domains.followup.models import ServiceFollowup, InsuranceFollowup
```

---

## PHASE 4: API IMPLEMENTATION (Critical Endpoints)

This section contains the MOST IMPORTANT API endpoints that make the system work.

### Endpoint Group 1: Lead Management

**File**: `backend/app/domains/crm/routes.py`

**ADD these endpoints** (append to existing file):

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from app.domains.crm.models import Lead, LeadFollowup, TestRide, LeadStatus
from datetime import datetime, timedelta

router = APIRouter(prefix="/leads", tags=["leads"])

@router.post("/")
async def create_lead(
    lead_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create new lead with auto-assignment"""
    lead = Lead(
        name=lead_data["name"],
        phone=lead_data["phone"],
        email=lead_data.get("email"),
        expected_purchase_days=lead_data.get("expected_purchase_days"),
        preferred_model_id=lead_data.get("preferred_model_id"),
        lead_status=lead_data.get("lead_status", "WARM"),
        assigned_staff_id=current_user["id"],  # Auto-assign to creator
        visit_date=datetime.utcnow()
    )
    lead.calculate_next_followup()  # Auto-calculate
    
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    return {"message": "Lead created", "lead": lead, "next_followup": lead.next_followup_date}

@router.post("/followup")
async def add_followup(
    followup_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add followup - REMARKS MANDATORY"""
    if not followup_data.get("remarks") or len(followup_data["remarks"]) < 10:
        raise HTTPException(status_code=400, detail="Remarks must be at least 10 characters")
    
    lead = db.query(Lead).filter(Lead.id == followup_data["lead_id"]).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    followup = LeadFollowup(
        lead_id=followup_data["lead_id"],
        followup_date=datetime.utcnow(),
        remarks=followup_data["remarks"],
        outcome_status=followup_data["outcome_status"],
        next_followup_date=followup_data.get("next_followup_date"),
        staff_id=current_user["id"]
    )
    db.add(followup)
    
    # Update lead
    lead.lead_status = followup_data["outcome_status"]
    lead.next_followup_date = followup_data.get("next_followup_date")
    
    db.commit()
    return {"message": "Followup added"}

@router.get("/dashboard")
async def get_lead_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get followup dashboard"""
    query = db.query(Lead).filter(Lead.deleted_at.is_(None))
    
    # Staff sees only their leads
    if current_user["role"] == "staff":
        query = query.filter(Lead.assigned_staff_id == current_user["id"])
    
    today = datetime.utcnow().date()
    
    overdue = query.filter(
        Lead.next_followup_date < today,
        Lead.is_converted == False
    ).all()
    
    today_followups = query.filter(
        Lead.next_followup_date == today,
        Lead.is_converted == False
    ).all()
    
    upcoming = query.filter(
        Lead.next_followup_date > today,
        Lead.is_converted == False
    ).all()
    
    return {
        "overdue": overdue,
        "today": today_followups,
        "upcoming": upcoming
    }

@router.post("/test-ride")
async def add_test_ride(
    test_ride_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add test ride for lead"""
    test_ride = TestRide(
        lead_id=test_ride_data["lead_id"],
        vehicle_model_id=test_ride_data["vehicle_model_id"],
        ride_date=test_ride_data.get("ride_date", datetime.utcnow()),
        remarks=test_ride_data.get("remarks"),
        rating=test_ride_data.get("rating"),
        created_by=current_user["id"]
    )
    db.add(test_ride)
    db.commit()
    return {"message": "Test ride added"}
```

---

### Endpoint Group 2: Unified Follow-ups

**Create directory**: `backend/app/domains/followup/`

**File**: `backend/app/domains/followup/routes.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.auth.dependencies import get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/followups", tags=["followups"])

@router.get("/dashboard")
async def get_unified_dashboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Unified dashboard showing:
    - Lead followups
    - Service reminders
    - Insurance renewals
    """
    # Refresh materialized view
    db.execute(text("REFRESH MATERIALIZED VIEW followup_aggregated_view"))
    db.commit()
    
    # Build query based on role
    query = "SELECT * FROM followup_aggregated_view"
    
    if current_user["role"] == "staff":
        query += f" WHERE staff_id = {current_user['id']}"
    
    query += " ORDER BY followup_date ASC"
    
    result = db.execute(text(query))
    all_followups = [dict(row._mapping) for row in result]
    
    # Categorize
    today = date.today()
    overdue = [f for f in all_followups if f['followup_date'] < today]
    today_followups = [f for f in all_followups if f['followup_date'] == today]
    upcoming = [f for f in all_followups if f['followup_date'] > today and f['followup_date'] <= today + timedelta(days=7)]
    
    return {
        "overdue": overdue,
        "today": today_followups,
        "upcoming": upcoming,
        "stats": {
            "total": len(all_followups),
            "overdue_count": len(overdue),
            "today_count": len(today_followups),
            "upcoming_count": len(upcoming)
        }
    }
```

---

### Endpoint Group 3: Sales Workflow

**File**: `backend/app/domains/sales/routes.py`

**ADD these endpoints**:

```python
@router.post("/")
async def create_sale(
    sale_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create sale - can be from lead or direct
    """
    sale = Sale(
        customer_id=sale_data["customer_id"],
        vehicle_model_id=sale_data["vehicle_model_id"],
        vehicle_price=sale_data["vehicle_price"],
        total_amount=sale_data["total_amount"],
        sale_stage=SaleStage.CONVERTED.value if sale_data.get("lead_id") else SaleStage.ENQUIRY.value,
        lead_id=sale_data.get("lead_id"),
        is_direct_sale=sale_data.get("lead_id") is None,
        created_by=current_user["id"]
    )
    
    db.add(sale)
    
    # If from lead, mark lead as converted
    if sale_data.get("lead_id"):
        lead = db.query(Lead).filter(Lead.id == sale_data["lead_id"]).first()
        if lead:
            lead.is_converted = True
            lead.converted_sale_id = sale.id
            lead.lead_status = LeadStatus.SOLD.value
    
    # Create portal tracking record
    portal_tracking = SalePortalTracking(sale_id=sale.id)
    db.add(portal_tracking)
    
    db.commit()
    db.refresh(sale)
    
    return {"message": "Sale created", "sale_id": sale.id, "stage": sale.sale_stage}

@router.put("/{sale_id}/stage")
async def advance_sale_stage(
    sale_id: int,
    stage_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Advance sale to next stage"""
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    new_stage = SaleStage(stage_data["stage"])
    sale.advance_stage(new_stage, current_user["id"], stage_data.get("remarks"))
    
    db.commit()
    return {"message": "Stage advanced", "new_stage": new_stage.value}

@router.post("/{sale_id}/payment")
async def add_payment(
    sale_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Add payment to sale"""
    payment = SalePayment(
        sale_id=sale_id,
        payment_type=payment_data["payment_type"],
        payment_mode=payment_data["payment_mode"],
        amount=payment_data["amount"],
        reference_number=payment_data.get("reference_number"),
        bank_name=payment_data.get("bank_name"),
        remarks=payment_data.get("remarks"),
        created_by=current_user["id"]
    )
    db.add(payment)
    db.commit()
    return {"message": "Payment added"}

@router.post("/{sale_id}/document")
async def generate_document(
    sale_id: int,
    doc_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Generate document"""
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    # Generate document number
    doc_type = doc_data["document_type"]
    doc_number = f"{doc_type[:3].upper()}/{sale_id}/{datetime.utcnow().year}"
    
    document = SaleDocument(
        sale_id=sale_id,
        document_type=doc_type,
        document_number=doc_number,
        generated_by=current_user["id"]
    )
    db.add(document)
    
    # Check if all mandatory docs are generated
    if sale.mandatory_docs_generated:
        sale.sale_stage = SaleStage.DELIVERY_READY.value
    
    db.commit()
    return {"message": "Document generated", "document_number": doc_number}

@router.get("/{sale_id}/progress")
async def get_sale_progress(
    sale_id: int,
    db: Session = Depends(get_db)
):
    """Get sale progress"""
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    return {
        "sale_id": sale.id,
        "current_stage": sale.sale_stage,
        "completion_percentage": sale.completion_percentage,
        "stage_history": [{"from": h.from_stage, "to": h.to_stage, "date": h.created_at} for h in sale.stage_history],
        "payments": len(sale.payments),
        "documents_generated": [d.document_type for d in sale.documents],
        "mandatory_docs_complete": sale.mandatory_docs_generated,
        "portal_tracking": sale.portal_tracking.__dict__ if sale.portal_tracking else None
    }

@router.put("/{sale_id}/portal")
async def update_portal_tracking(
    sale_id: int,
    portal_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update portal tracking"""
    tracking = db.query(SalePortalTracking).filter(SalePortalTracking.sale_id == sale_id).first()
    if not tracking:
        raise HTTPException(status_code=404, detail="Portal tracking not found")
    
    # Update fields
    for key, value in portal_data.items():
        if hasattr(tracking, key):
            setattr(tracking, key, value)
    
    # Check completion
    tracking.check_completion()
    
    db.commit()
    return {"message": "Portal tracking updated"}
```

---

## PHASE 5: FRONTEND CHANGES

### Change 1: Rename CRM to Leads

**File**: `frontend/src/components/layout/Sidebar.tsx`

**Find**:
```typescript
<NavLink to="/crm">CRM</NavLink>
```

**Replace**:
```typescript
<NavLink to="/leads">Leads</NavLink>
```

---

### Change 2: Add Follow-up Tab

**File**: `frontend/src/components/layout/Sidebar.tsx`

**Add after Leads**:
```typescript
<NavLink to="/follow-ups">
  <Clock className="h-5 w-5" />
  <span>Follow-ups</span>
  {pendingCount > 0 && (
    <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
      {pendingCount}
    </span>
  )}
</NavLink>
```

---

### Change 3: Sales Progress Bar Component

**Create file**: `frontend/src/modules/sales/components/SalesProgressBar.tsx`

```typescript
import React from 'react';

interface ProgressBarProps {
  currentStage: string;
  completionPercentage: number;
}

const STAGES = [
  { key: 'ENQUIRY', label: 'Enquiry' },
  { key: 'CONVERTED', label: 'Converted' },
  { key: 'CUSTOMER_DETAILS_COMPLETED', label: 'Customer Details' },
  { key: 'BILLING_COMPLETED', label: 'Billing' },
  { key: 'DELIVERY_READY', label: 'Delivery Ready' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' }
];

export const SalesProgressBar: React.FC<ProgressBarProps> = ({ 
  currentStage, 
  completionPercentage 
}) => {
  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  
  return (
    <div className="w-full py-4">
      <div className="flex justify-between mb-2">
        {STAGES.map((stage, index) => (
          <div 
            key={stage.key}
            className={`flex flex-col items-center ${
              index <= currentIndex ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              index <= currentIndex 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300'
            }`}>
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <span className="text-xs mt-2 text-center max-w-[80px]">
              {stage.label}
            </span>
          </div>
        ))}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      
      <div className="text-center mt-2 text-sm text-gray-600">
        {completionPercentage}% Complete
      </div>
    </div>
  );
};
```

---

### Change 4: Follow-up Dashboard Page

**Create file**: `frontend/src/modules/followup/pages/FollowupDashboard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Followup {
  followup_type: string;
  entity_name: string;
  contact_phone: string;
  followup_date: string;
  status: string;
}

export const FollowupDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { data } = await axios.get('/api/followups/dashboard');
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Follow-up Dashboard</h1>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-red-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {dashboard.stats.overdue_count}
          </div>
          <div className="text-sm text-red-700">Overdue</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {dashboard.stats.today_count}
          </div>
          <div className="text-sm text-yellow-700">Today</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {dashboard.stats.upcoming_count}
          </div>
          <div className="text-sm text-green-700">Upcoming</div>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {dashboard.stats.total}
          </div>
          <div className="text-sm text-blue-700">Total</div>
        </div>
      </div>

      {/* Overdue */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-red-600">
          🔴 Overdue Follow-ups
        </h2>
        <div className="space-y-2">
          {dashboard.overdue.map((f: Followup, i: number) => (
            <div key={i} className="bg-white border-l-4 border-red-500 p-4 rounded shadow">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{f.entity_name}</div>
                  <div className="text-sm text-gray-500">{f.contact_phone}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Type: {f.followup_type} | Due: {f.followup_date}
                  </div>
                </div>
                <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                  Follow Up Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-yellow-600">
          🟡 Today's Follow-ups
        </h2>
        <div className="space-y-2">
          {dashboard.today.map((f: Followup, i: number) => (
            <div key={i} className="bg-white border-l-4 border-yellow-500 p-4 rounded shadow">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{f.entity_name}</div>
                  <div className="text-sm text-gray-500">{f.contact_phone}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Type: {f.followup_type}
                  </div>
                </div>
                <button className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">
                  Follow Up
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-xl font-semibold mb-3 text-green-600">
          🟢 Upcoming Follow-ups (Next 7 days)
        </h2>
        <div className="space-y-2">
          {dashboard.upcoming.map((f: Followup, i: number) => (
            <div key={i} className="bg-white border-l-4 border-green-500 p-4 rounded shadow">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{f.entity_name}</div>
                  <div className="text-sm text-gray-500">{f.contact_phone}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Type: {f.followup_type} | Due: {f.followup_date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## PHASE 6: REGISTER ROUTES

**File**: `backend/app/main.py`

**ADD** after existing route registrations:

```python
from app.domains.followup.routes import router as followup_router

app.include_router(followup_router, prefix="/api")
```

---

## PHASE 7: IMPLEMENTATION ROADMAP

### Execution Order (CRITICAL - Follow Exactly)

**STEP 1**: Database Setup (1 hour)
```bash
# 1. Create migration
alembic revision --autogenerate -m "complete_erp_workflow_redesign"

# 2. Copy migration code from this guide

# 3. Run migration
alembic upgrade head

# 4. Verify tables created
psql -d erp_db -c "\dt crm.*" 
psql -d erp_db -c "\dt sales.*"
```

**STEP 2**: Update Models (2 hours)
- Update `crm/models.py`
- Update `sales/models.py`
- Create `followup/models.py`
- Update `bootstrap.py`

**STEP 3**: Test Backend Startup
```bash
python -m uvicorn app.main:app --reload
# Should start without errors
```

**STEP 4**: Add API Endpoints (3 hours)
- Update `crm/routes.py`
- Update `sales/routes.py`
- Create `followup/routes.py`
- Register in `main.py`

**STEP 5**: Test APIs with Postman
- Test lead creation
- Test followup addition
- Test followup dashboard
- Test sales creation

**STEP 6**: Frontend Changes (4 hours)
- Rename CRM to Leads in Sidebar
- Add Follow-up tab
- Create FollowupDashboard component
- Create SalesProgressBar component
- Update routes

**STEP 7**: Integration Testing (2 hours)
- Create lead → Add followup → Check dashboard
- Create direct sale → Add payment → Generate docs
- Convert lead to sale → Track progress

**STEP 8**: Final Verification
```
✅ Lead creation works
✅ Follow-up mandatory remarks enforced
✅ Unified follow-up dashboard shows all types
✅ Sale progress bar displays correctly
✅ Documents can be generated
✅ Portal tracking works
✅ No console errors
✅ No backend errors
```

---

## 📋 CRITICAL CHECKLIST FOR AI AGENT

**Before Starting**:
- [ ] Read entire guide
- [ ] Understand business flow
- [ ] Have database backup
- [ ] Have git checkpoint

**Phase 1 Complete**:
- [ ] Migration created and ran successfully
- [ ] All 10+ tables created
- [ ] Materialized view created
- [ ] Backend starts without errors

**Phase 2 Complete**:
- [ ] All models updated
- [ ] Relationships defined
- [ ] Enums created
- [ ] Methods added to models

**Phase 3 Complete**:
- [ ] All API endpoints added
- [ ] Routes registered in main.py
- [ ] APIs tested with Postman

**Phase 4 Complete**:
- [ ] Sidebar updated
- [ ] Follow-up dashboard created
- [ ] Progress bar component created
- [ ] Frontend compiles

**Final Verification**:
- [ ] Full workflow tested
- [ ] Lead to sale conversion works
- [ ] Direct sale works
- [ ] Follow-ups show in dashboard
- [ ] Documents printable
- [ ] No errors in console or logs

---

## 🎉 SUCCESS CRITERIA

**Implementation is 100% complete when**:

1. ✅ Staff can create leads with auto-followup calculation
2. ✅ Follow-ups require minimum 10-character remarks
3. ✅ Unified dashboard shows leads + service + insurance
4. ✅ Sales can be created from leads OR directly
5. ✅ Progress bar shows current stage visually
6. ✅ Payments support multiple modes
7. ✅ Documents generate with unique numbers
8. ✅ Portal tracking allows flexible completion order
9. ✅ Number plate flow tracked properly
10. ✅ Dealer can see staff performance metrics

---

**Document Status**: ✅ Ready for AI Agent Execution  
**Complexity**: Very High  
**Risk**: Medium (phased approach mitigates risk)  
**Expected Outcome**: Production-grade ERP system  

**Next Steps**: Give this guide to AI agent with execution prompt
