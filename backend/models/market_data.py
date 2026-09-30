from datetime import datetime, date, timezone
from sqlalchemy import String, Date, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class MarketData(Base):
    __tablename__ = "market_data"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    commodity_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    unit: Mapped[str] = mapped_column(String(50), nullable=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=True)
    source: Mapped[str] = mapped_column(String(255), nullable=True)
    price_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
