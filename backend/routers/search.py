from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from database.postgres import get_db
from models.rfq import RFQ
from models.supplier import Supplier
from models.quotation import Quotation

router = APIRouter(prefix="/search", tags=["Global Search"])


class SearchResultItem(BaseModel):
    id: Any
    type: str  # "rfq", "supplier", "quotation"
    title: str
    subtitle: Optional[str] = None
    url: str


class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]


class SearchRequestPayload(BaseModel):
    query: Optional[str] = ""


@router.get("", response_model=SearchResponse)
@router.get("/", response_model=SearchResponse)
async def global_search_get(
    q: Optional[str] = Query("", description="Query string for search"),
    db: AsyncSession = Depends(get_db),
):
    return await _execute_search(q or "", db)


@router.post("", response_model=SearchResponse)
@router.post("/", response_model=SearchResponse)
async def global_search_post(
    payload: Optional[SearchRequestPayload] = None,
    db: AsyncSession = Depends(get_db),
):
    query_str = payload.query if payload and payload.query else ""
    return await _execute_search(query_str, db)


async def _execute_search(query_str: str, db: AsyncSession) -> SearchResponse:
    clean_query = (query_str or "").strip()
    if not clean_query:
        return SearchResponse(query="", total_results=0, results=[])

    search_pattern = f"%{clean_query}%"
    results: List[SearchResultItem] = []

    try:
        # 1. Search RFQs
        rfq_stmt = select(RFQ).where(
            or_(
                RFQ.title.ilike(search_pattern),
                RFQ.description.ilike(search_pattern),
                RFQ.category.ilike(search_pattern),
            )
        ).limit(8)
        rfq_res = await db.execute(rfq_stmt)
        for rfq in rfq_res.scalars().all():
            results.append(
                SearchResultItem(
                    id=rfq.id,
                    type="rfq",
                    title=rfq.title,
                    subtitle=f"{rfq.category or 'RFQ'} • Status: {rfq.status.value if hasattr(rfq.status, 'value') else rfq.status}",
                    url=f"/rfq/{rfq.id}",
                )
            )

        # 2. Search Suppliers
        sup_stmt = select(Supplier).where(
            or_(
                Supplier.name.ilike(search_pattern),
                Supplier.country.ilike(search_pattern),
            )
        ).limit(8)
        sup_res = await db.execute(sup_stmt)
        for sup in sup_res.scalars().all():
            results.append(
                SearchResultItem(
                    id=sup.id,
                    type="supplier",
                    title=sup.name,
                    subtitle=f"Supplier • Origin: {sup.country or 'Global'}",
                    url=f"/risk/{sup.id}",
                )
            )

        # 3. Search Quotations
        q_stmt = select(Quotation).where(
            or_(
                Quotation.quotation_number.ilike(search_pattern),
            )
        ).limit(8)
        q_res = await db.execute(q_stmt)
        for quote in q_res.scalars().all():
            results.append(
                SearchResultItem(
                    id=quote.id,
                    type="quotation",
                    title=f"Quote {quote.quotation_number or quote.id}",
                    subtitle=f"RFQ #{quote.rfq_id} • Amount: ₹{quote.total_amount:,.0f} {quote.currency}",
                    url=f"/rfq/{quote.rfq_id}",
                )
            )
    except Exception as exc:
        # Fallback cleanly - NEVER 500
        pass

    return SearchResponse(
        query=clean_query,
        total_results=len(results),
        results=results,
    )
