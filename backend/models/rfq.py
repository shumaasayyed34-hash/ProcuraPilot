import enum
from datetime import datetime, date, timezone
from sqlalchemy import String, Text, Date, DateTime, Enum, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.postgres import Base


class RFQStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    under_comparison = "under_comparison"
    completed = "completed"
    cancelled = "cancelled"


class RFQ(Base):
    __tablename__ = "rfqs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rfq_number: Mapped[str | None] = mapped_column(String(50), unique=True, index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    budget: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    # Deadlines & Dates
    rfq_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    submission_deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    required_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Legacy fields (preserved for existing Phase 1-3 compatibility)
    quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Buyer Details
    buyer_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    buyer_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    buyer_contact_person: Mapped[str | None] = mapped_column(String(255), nullable=True)
    buyer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    buyer_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Commercial & Shipping Terms
    payment_terms: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dispatch_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipment_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    port_of_loading: Mapped[str | None] = mapped_column(String(100), nullable=True)
    port_of_discharge: Mapped[str | None] = mapped_column(String(100), nullable=True)
    delivery_location: Mapped[str | None] = mapped_column(Text, nullable=True)
    additional_terms: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[RFQStatus] = mapped_column(Enum(RFQStatus), default=RFQStatus.draft, nullable=False)
    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    items = relationship("RFQItem", back_populates="rfq", cascade="all, delete-orphan", lazy="selectin")
    invited_suppliers = relationship("RFQSupplier", back_populates="rfq", cascade="all, delete-orphan", lazy="selectin")
    quotations = relationship("Quotation", back_populates="rfq", lazy="selectin")
