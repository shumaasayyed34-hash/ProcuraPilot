import enum
from datetime import datetime
from sqlalchemy import Text, DateTime, Enum, ForeignKey, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class RiskCategory(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class RiskReport(Base):
    __tablename__ = "risk_reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=True, index=True)
    composite_risk_score: Mapped[float] = mapped_column(Float, nullable=True)
    financial_risk: Mapped[float] = mapped_column(Float, nullable=True)
    compliance_risk: Mapped[float] = mapped_column(Float, nullable=True)
    delivery_risk: Mapped[float] = mapped_column(Float, nullable=True)
    country_risk: Mapped[float] = mapped_column(Float, nullable=True)
    esg_risk: Mapped[float] = mapped_column(Float, nullable=True)
    fraud_risk: Mapped[float] = mapped_column(Float, nullable=True)
    risk_category: Mapped[RiskCategory] = mapped_column(Enum(RiskCategory), nullable=True)
    news_sentiment_score: Mapped[float] = mapped_column(Float, nullable=True)
    risk_narrative: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
