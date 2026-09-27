from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class SupplierScore(Base):
    __tablename__ = "supplier_scores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    ahp_score: Mapped[float] = mapped_column(Float, nullable=True)
    price_score: Mapped[float] = mapped_column(Float, nullable=True)
    quality_score: Mapped[float] = mapped_column(Float, nullable=True)
    delivery_score: Mapped[float] = mapped_column(Float, nullable=True)
    esg_score: Mapped[float] = mapped_column(Float, nullable=True)
    rank_position: Mapped[int] = mapped_column(Integer, nullable=True)
    criteria_weights: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
