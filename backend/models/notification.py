import enum
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Enum, ForeignKey, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from database.postgres import Base


class NotificationType(str, enum.Enum):
    info = "info"
    warning = "warning"
    critical = "critical"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), default=NotificationType.info, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    related_rfq_id: Mapped[int] = mapped_column(Integer, ForeignKey("rfqs.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
