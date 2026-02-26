"""
Service layer for Setup module — generic CRUD operations on master tables.
Uses raw SQL via SQLAlchemy engine (consistent with the rest of the codebase).
"""
from datetime import datetime
from sqlalchemy import text
from app.db.session import engine


# ==================== GENERIC HELPERS ====================

async def _list_all(table: str, schema: str = "master"):
    """List all records from a table, ordered by created_at desc."""
    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"SELECT * FROM {schema}.{table} ORDER BY created_at DESC")
        )
        return [dict(row) for row in result.mappings().all()]


async def _get_by_id(table: str, id_column: str, id_value: int, schema: str = "master"):
    """Get a single record by its primary key."""
    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"SELECT * FROM {schema}.{table} WHERE {id_column} = :id"),
            {"id": id_value}
        )
        return dict(result.mappings().first()) if result.rowcount else None


# ==================== BRAND ====================

async def list_brands():
    return await _list_all("brand")

async def create_brand(data: dict, staff_id: int):
    async with engine.begin() as conn:
        # Check if brand exists (including deleted)
        result = await conn.execute(
            text("SELECT * FROM master.brand WHERE LOWER(brand_name) = LOWER(:name)"),
            {"name": data["brand_name"]}
        )
        existing = result.mappings().first()

        if existing:
            if existing['deleted_at']:
                # Restore
                await conn.execute(
                    text("UPDATE master.brand SET deleted_at = NULL WHERE brand_id = :id"),
                    {"id": existing['brand_id']}
                )
                # Return updated brand
                return {**dict(existing), "deleted_at": None}
            else:
                raise ValueError("Brand already exists")

        result = await conn.execute(
            text("""
                INSERT INTO master.brand (brand_name, created_by)
                VALUES (:brand_name, :created_by)
                RETURNING brand_id, brand_name
            """),
            {"brand_name": data["brand_name"], "created_by": staff_id}
        )
        return dict(result.mappings().first())

async def update_brand(brand_id: int, data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                UPDATE master.brand SET brand_name = :brand_name, updated_at = NOW(), updated_by = :updated_by
                WHERE brand_id = :brand_id
                RETURNING brand_id, brand_name
            """),
            {"brand_name": data["brand_name"], "brand_id": brand_id, "updated_by": staff_id}
        )
        row = result.mappings().first()
        if not row:
            return None
        return dict(row)

async def delete_brand(brand_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.brand 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE brand_id = :id
            """),
            {"id": brand_id, "staff_id": staff_id}
        )

async def restore_brand(brand_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.brand SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE brand_id = :id"),
            {"id": brand_id}
        )


# ==================== PAYMENT MODE ====================

async def list_payment_modes():
    return await _list_all("payment_mode")

async def create_payment_mode(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.payment_mode (mode_name, description, created_by)
                VALUES (:mode_name, :description, :created_by)
                RETURNING *
            """),
            {"mode_name": data["mode_name"], "description": data.get("description"), "created_by": staff_id}
        )
        return dict(result.mappings().first())

async def update_payment_mode(payment_mode_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": payment_mode_id, "updated_by": staff_id, "updated_at": datetime.utcnow()}
    for field in ["mode_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.payment_mode SET {', '.join(sets)} WHERE payment_mode_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_payment_mode(payment_mode_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.payment_mode 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE payment_mode_id = :id
            """),
            {"id": payment_mode_id, "staff_id": staff_id}
        )

async def restore_payment_mode(payment_mode_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.payment_mode SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE payment_mode_id = :id"),
            {"id": payment_mode_id}
        )


# ==================== EXPENSE CATEGORY ====================

async def list_expense_categories():
    return await _list_all("expense_category")

async def create_expense_category(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.expense_category (category_name, description, created_by)
                VALUES (:category_name, :description, :created_by)
                RETURNING *
            """),
            {"category_name": data["category_name"], "description": data.get("description"), "created_by": staff_id}
        )
        return dict(result.mappings().first())

async def update_expense_category(expense_category_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": expense_category_id, "updated_by": staff_id, "updated_at": datetime.utcnow()}
    for field in ["category_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.expense_category SET {', '.join(sets)} WHERE expense_category_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_expense_category(expense_category_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.expense_category 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE expense_category_id = :id
            """),
            {"id": expense_category_id, "staff_id": staff_id}
        )

async def restore_expense_category(expense_category_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.expense_category SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE expense_category_id = :id"),
            {"id": expense_category_id}
        )


# ==================== JOB CARD CATEGORY ====================

async def list_job_card_categories():
    return await _list_all("job_card_category")

async def create_job_card_category(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.job_card_category (category_name, description, created_by)
                VALUES (:category_name, :description, :created_by)
                RETURNING *
            """),
            {"category_name": data["category_name"], "description": data.get("description"), "created_by": staff_id}
        )
        return dict(result.mappings().first())

async def update_job_card_category(job_card_category_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": job_card_category_id, "updated_by": staff_id, "updated_at": datetime.utcnow()}
    for field in ["category_name", "description", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.job_card_category SET {', '.join(sets)} WHERE job_card_category_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_job_card_category(job_card_category_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.job_card_category 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE job_card_category_id = :id
            """),
            {"id": job_card_category_id, "staff_id": staff_id}
        )

async def restore_job_card_category(job_card_category_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.job_card_category SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE job_card_category_id = :id"),
            {"id": job_card_category_id}
        )


# ==================== INSURANCE COMPANY ====================

async def list_insurance_companies():
    return await _list_all("insurance_company")

async def create_insurance_company(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.insurance_company
                (company_name, contact_person, contact_number, email, address, gstin, created_by)
                VALUES (:company_name, :contact_person, :contact_number, :email, :address, :gstin, :created_by)
                RETURNING *
            """),
            {
                "company_name": data["company_name"],
                "contact_person": data.get("contact_person"),
                "contact_number": data.get("contact_number"),
                "email": data.get("email"),
                "address": data.get("address"),
                "gstin": data.get("gstin"),
                "created_by": staff_id,
            }
        )
        return dict(result.mappings().first())

async def update_insurance_company(insurance_company_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": insurance_company_id, "updated_by": staff_id, "updated_at": datetime.utcnow()}
    for field in ["company_name", "contact_person", "contact_number", "email", "address", "gstin", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.insurance_company SET {', '.join(sets)} WHERE insurance_company_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_insurance_company(insurance_company_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.insurance_company 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE insurance_company_id = :id
            """),
            {"id": insurance_company_id, "staff_id": staff_id}
        )

async def restore_insurance_company(insurance_company_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.insurance_company SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE insurance_company_id = :id"),
            {"id": insurance_company_id}
        )


# ==================== BANK ====================

async def list_banks():
    return await _list_all("bank")

async def create_bank(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.bank
                (bank_name, branch, ifsc_code, address, contact_number, created_by)
                VALUES (:bank_name, :branch, :ifsc_code, :address, :contact_number, :created_by)
                RETURNING *
            """),
            {
                "bank_name": data["bank_name"],
                "branch": data.get("branch"),
                "ifsc_code": data["ifsc_code"],
                "address": data.get("address"),
                "contact_number": data.get("contact_number"),
                "created_by": staff_id,
            }
        )
        return dict(result.mappings().first())

async def update_bank(bank_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": bank_id, "updated_by": staff_id, "updated_at": datetime.utcnow()}
    for field in ["bank_name", "branch", "ifsc_code", "address", "contact_number", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.bank SET {', '.join(sets)} WHERE bank_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_bank(bank_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.bank 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE bank_id = :id
            """),
            {"id": bank_id, "staff_id": staff_id}
        )

async def restore_bank(bank_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.bank SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE bank_id = :id"),
            {"id": bank_id}
        )


# ==================== DOCUMENT TYPE ====================

async def list_document_types():
    return await _list_all("document_type")

async def create_document_type(data: dict, staff_id: int):
    async with engine.begin() as conn:
        result = await conn.execute(
            text("""
                INSERT INTO master.document_type
                (type_name, description, applicable_to, is_mandatory, created_by)
                VALUES (:type_name, :description, :applicable_to, :is_mandatory, :created_by)
                RETURNING *
            """),
            {
                "type_name": data["type_name"],
                "description": data.get("description"),
                "applicable_to": data.get("applicable_to"),
                "is_mandatory": data.get("is_mandatory", False),
                "created_by": staff_id,
            }
        )
        return dict(result.mappings().first())

async def update_document_type(document_type_id: int, data: dict, staff_id: int):
    sets = []
    params = {"id": document_type_id, "updated_at": datetime.utcnow()}
    for field in ["type_name", "description", "applicable_to", "is_mandatory", "is_active"]:
        if field in data and data[field] is not None:
            sets.append(f"{field} = :{field}")
            params[field] = data[field]
    sets.append("updated_at = :updated_at")
    sets.append("updated_by = :updated_by")
    params["updated_by"] = staff_id

    async with engine.begin() as conn:
        result = await conn.execute(
            text(f"UPDATE master.document_type SET {', '.join(sets)} WHERE document_type_id = :id RETURNING *"),
            params
        )
        row = result.mappings().first()
        return dict(row) if row else None

async def delete_document_type(document_type_id: int, staff_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("""
                UPDATE master.document_type 
                SET is_deleted = TRUE, deleted_at = NOW(), is_active = FALSE, deleted_by = :staff_id 
                WHERE document_type_id = :id
            """),
            {"id": document_type_id, "staff_id": staff_id}
        )

async def restore_document_type(document_type_id: int):
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE master.document_type SET is_deleted = FALSE, is_active = TRUE, deleted_at = NULL, deleted_by = NULL WHERE document_type_id = :id"),
            {"id": document_type_id}
        )

# Add this at the end of backend/app/domains/setup/services.py

async def get_showroom_config():
    """Fetch the single showroom configuration record."""
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT * FROM master.showroom_config LIMIT 1"))
        row = result.mappings().first()
        return dict(row) if row else None

async def upsert_showroom_config(data: dict, staff_id: int):
    """Insert or Update the single showroom config record."""
    async with engine.begin() as conn:
        # Check if exists
        result = await conn.execute(text("SELECT config_id FROM master.showroom_config LIMIT 1"))
        existing = result.scalar()

        if existing:
            # Update
            sets = [f"{k} = :{k}" for k in data.keys()]
            sets.append("updated_at = NOW()")
            sets.append("updated_by = :staff_id")
            query = f"UPDATE master.showroom_config SET {', '.join(sets)} WHERE config_id = :config_id RETURNING *"
            params = {**data, "config_id": existing, "staff_id": staff_id}
        else:
            # Insert
            cols = list(data.keys()) + ["created_by"]
            vals = [f":{k}" for k in data.keys()] + [":staff_id"]
            query = f"INSERT INTO master.showroom_config ({', '.join(cols)}) VALUES ({', '.join(vals)}) RETURNING *"
            params = {**data, "staff_id": staff_id}

        updated_result = await conn.execute(text(query), params)
        return dict(updated_result.mappings().first())