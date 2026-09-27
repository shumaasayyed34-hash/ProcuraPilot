from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database.postgres import create_all_tables
from routers import auth as auth_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("ProcuraPilot API starting up...")
    await create_all_tables()
    yield
    print("ProcuraPilot API shutting down...")


app = FastAPI(title="ProcuraPilot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"status": "ProcuraPilot API is running"}
