import enum
from datetime import datetime, date, timezone
from sqlalchemy import String, Text, Date, DateTime, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
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
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    quantity: Mapped[float] = mapped_column(nullable=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=True)
    required_delivery_date: Mapped[date] = mapped_column(Date, nullable=True)
    status: Mapped[RFQStatus] = mapped_column(Enum(RFQStatus), default=RFQStatus.draft, nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
