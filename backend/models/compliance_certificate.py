import enum
from datetime import datetime, date, timezone
from sqlalchemy import String, Date, DateTime, Enum, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class CertificateType(str, enum.Enum):
    ISO = "ISO"
    GST = "GST"
    MSME = "MSME"
    ESG = "ESG"


class ComplianceCertificate(Base):
    __tablename__ = "compliance_certificates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    certificate_type: Mapped[CertificateType] = mapped_column(Enum(CertificateType), nullable=False)
    certificate_number: Mapped[str] = mapped_column(String(100), nullable=True)
    issuing_authority: Mapped[str] = mapped_column(String(255), nullable=True)
    issue_date: Mapped[date] = mapped_column(Date, nullable=True)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_expired: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    document_path: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
