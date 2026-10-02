import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# List of columns to ensure exist on rfqs table
RFQ_NEW_COLUMNS = [
    ("rfq_number", "VARCHAR(50)"),
    ("rfq_date", "DATE"),
    ("submission_deadline", "DATE"),
    ("budget", "FLOAT"),
    ("currency", "VARCHAR(10) DEFAULT 'INR'"),
    ("buyer_company", "VARCHAR(255)"),
    ("buyer_address", "TEXT"),
    ("buyer_contact_person", "VARCHAR(255)"),
    ("buyer_email", "VARCHAR(255)"),
    ("buyer_phone", "VARCHAR(50)"),
    ("payment_terms", "VARCHAR(255)"),
    ("dispatch_method", "VARCHAR(100)"),
    ("shipment_type", "VARCHAR(100)"),
    ("port_of_loading", "VARCHAR(100)"),
    ("port_of_discharge", "VARCHAR(100)"),
    ("delivery_location", "TEXT"),
    ("additional_terms", "TEXT"),
]


async def run_safe_schema_migrations(engine: AsyncEngine):
    """Safely adds missing columns to existing tables without data loss or dropping tables."""
    try:
        async with engine.begin() as conn:
            # Check existing columns on rfqs
            # Works across both SQLite and PostgreSQL
            try:
                result = await conn.execute(text("PRAGMA table_info(rfqs)"))
                rows = result.fetchall()
                existing_cols = {r[1] for r in rows}
            except Exception:
                # PostgreSQL information_schema fallback
                result = await conn.execute(
                    text("SELECT column_name FROM information_schema.columns WHERE table_name = 'rfqs'")
                )
                rows = result.fetchall()
                existing_cols = {r[0] for r in rows}

            if existing_cols:
                for col_name, col_type in RFQ_NEW_COLUMNS:
                    if col_name not in existing_cols:
                        try:
                            await conn.execute(text(f"ALTER TABLE rfqs ADD COLUMN {col_name} {col_type}"))
                            logger.info(f"Migrated rfqs table: added column {col_name}")
                        except Exception as alter_err:
                            logger.warning(f"Could not add column {col_name} to rfqs: {alter_err}")

        logger.info("Safe schema migrations executed successfully.")
    except Exception as e:
        logger.error(f"Schema migration error: {e}", exc_info=True)
