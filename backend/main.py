from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database.mongodb import close_mongo_client
from database.postgres import create_all_tables
from routers import auth as auth_router
from routers import extraction as extraction_router
from routers import suppliers as suppliers_router
from routers import rfqs as rfqs_router
from routers import quotations as quotations_router
from routers import vector as vector_router
from routers import memory as memory_router
from routers import ahp as ahp_router
from routers import ahp_agent as ahp_agent_router

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("ProcuraPilot API starting up...")
    await create_all_tables()
    yield
    print("ProcuraPilot API shutting down...")
    close_mongo_client()


app = FastAPI(title="ProcuraPilot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/api/v1")
app.include_router(extraction_router.router, prefix="/api/v1")
app.include_router(suppliers_router.router, prefix="/api/v1")
app.include_router(rfqs_router.router, prefix="/api/v1")
app.include_router(quotations_router.router, prefix="/api/v1")
app.include_router(vector_router.router, prefix="/api/v1")
app.include_router(memory_router.router, prefix="/api/v1")
app.include_router(ahp_router.router, prefix="/api/v1")
app.include_router(ahp_agent_router.router, prefix="/api/v1")



@app.get("/")
async def root():
    return {"status": "ProcuraPilot API is running"}

