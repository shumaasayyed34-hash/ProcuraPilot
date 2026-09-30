import enum
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class ValidationStatus(str, enum.Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    unit_price: Mapped[float] = mapped_column(Float, nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=True)
    gst_percentage: Mapped[float] = mapped_column(Float, nullable=True)
    delivery_time_days: Mapped[int] = mapped_column(Integer, nullable=True)
    payment_terms: Mapped[str] = mapped_column(String(255), nullable=True)
    incoterms: Mapped[str] = mapped_column(String(50), nullable=True)
    moq: Mapped[float] = mapped_column(Float, nullable=True)
    validity_days: Mapped[int] = mapped_column(Integer, nullable=True)
    warranty_months: Mapped[int] = mapped_column(Integer, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    extraction_confidence: Mapped[float] = mapped_column(Float, nullable=True)
    validation_status: Mapped[ValidationStatus] = mapped_column(Enum(ValidationStatus), default=ValidationStatus.pending, nullable=False)
    validation_errors: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
