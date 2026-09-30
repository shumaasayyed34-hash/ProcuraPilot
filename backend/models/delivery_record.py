from datetime import datetime, date, timezone
from sqlalchemy import Text, Date, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class DeliveryRecord(Base):
    __tablename__ = "delivery_records"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=True)
    expected_delivery_date: Mapped[date] = mapped_column(Date, nullable=True)
    actual_delivery_date: Mapped[date] = mapped_column(Date, nullable=True)
    delay_days: Mapped[int] = mapped_column(Integer, nullable=True)
    on_time: Mapped[bool] = mapped_column(Boolean, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
