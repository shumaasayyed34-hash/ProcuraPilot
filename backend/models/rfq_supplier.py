import enum
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, Enum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.postgres import Base


class RFQSupplierStatus(str, enum.Enum):
    invited = "invited"
    responded = "responded"
    declined = "declined"


class RFQSupplier(Base):
    __tablename__ = "rfq_suppliers"
    __table_args__ = (
        UniqueConstraint("rfq_id", "supplier_id", name="uq_rfq_supplier"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[RFQSupplierStatus] = mapped_column(
        Enum(RFQSupplierStatus),
        default=RFQSupplierStatus.invited,
        nullable=False,
    )
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    responded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    rfq = relationship("RFQ", back_populates="invited_suppliers")
    supplier = relationship("Supplier")
