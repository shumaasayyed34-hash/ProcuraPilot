from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)
    gstin: Mapped[str] = mapped_column(String(20), nullable=True)
    msme_number: Mapped[str] = mapped_column(String(50), nullable=True)
    iso_certified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    years_in_business: Mapped[int] = mapped_column(Integer, nullable=True)
    annual_revenue: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
