from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.postgres import Base


class RFQItem(Base):
    __tablename__ = "rfq_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    product_code: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False, default="EACH")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    rfq = relationship("RFQ", back_populates="items")
