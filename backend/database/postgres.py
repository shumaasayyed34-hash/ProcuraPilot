import os
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from dotenv import load_dotenv

# Load .env from the backend directory regardless of working directory
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
SQLITE_PATH = Path(__file__).parent.parent / "procurapilot.db"
SQLITE_URL = f"sqlite+aiosqlite:///{SQLITE_PATH}"

_using_sqlite = False

try:
    engine = create_async_engine(DATABASE_URL, echo=False)
except Exception:
    _using_sqlite = True
    engine = create_async_engine(SQLITE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def create_all_tables():
    global engine, AsyncSessionLocal, _using_sqlite
    import models  # noqa: F401 — ensures all models are registered on Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Connected to PostgreSQL database. All tables verified.")
    except Exception as exc:
        print(f"PostgreSQL connection failed ({exc}). Switching to local SQLite persistent database at {SQLITE_PATH}.")
        _using_sqlite = True
        engine = create_async_engine(SQLITE_URL, echo=False)
        AsyncSessionLocal = sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("All tables successfully initialized in local SQLite database.")

    await seed_default_users()


async def seed_default_users():
    from sqlalchemy import select
    from models.user import User, UserRole
    from utils.auth import hash_password

    demo_users = [
        ("buyer@procurapilot.ai", "Procura@2026", "Procurement Buyer", UserRole.procurement_manager),
        ("manager@procurapilot.ai", "Procura@2026", "Procurement Manager", UserRole.procurement_manager),
        ("faisal@procurapilot.ai", "Procura@2026", "Faisal Sakware", UserRole.admin),
    ]

    try:
        async with AsyncSessionLocal() as session:
            for email, pwd, name, role in demo_users:
                res = await session.execute(select(User).where(User.email == email))
                if not res.scalar_one_or_none():
                    u = User(
                        email=email,
                        hashed_password=hash_password(pwd),
                        full_name=name,
                        role=role,
                    )
                    session.add(u)
            await session.commit()
        print("Default users seeded successfully.")
    except Exception as exc:
        print(f"User seeding note: {exc}")
