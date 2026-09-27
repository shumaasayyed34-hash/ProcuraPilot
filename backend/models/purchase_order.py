import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class POStatus(str, enum.Enum):
    draft = "draft"
    pending_approval = "pending_approval"
    approved = "approved"
    sent = "sent"
    completed = "completed"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    po_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=True)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=True)
    status: Mapped[POStatus] = mapped_column(Enum(POStatus), default=POStatus.draft, nullable=False)
    approved_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    delivery_address: Mapped[str] = mapped_column(Text, nullable=True)
    payment_terms: Mapped[str] = mapped_column(String(255), nullable=True)
    special_terms: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
