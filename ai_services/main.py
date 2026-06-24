from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timedelta, timezone
from typing import List

# Initialize the API
app = FastAPI(
    title="EcoVerse AI Services",
    description="Microservices for Carbon Estimation and Analytics",
    version="0.2.0"
)

# --- MODELS ---
class ProductData(BaseModel):
    product_name: str
    category: str
    barcode: str | None = None
    weight_g: float = Field(default=100.0, gt=0)

class ScanItem(BaseModel):
    product_name: str
    category: str
    # FIX 1: Ensure carbon footprint cannot be negative
    carbon_footprint_kg: float = Field(ge=0)
    scanned_at: datetime

class AnalyticsRequest(BaseModel):
    user_id: str
    scans: List[ScanItem]

# --- ENDPOINT 1: Estimation ---
@app.post("/api/estimate")
async def estimate_carbon(product: ProductData):
    category_multipliers = {
        "food": 2.5,
        "electronics": 15.0,
        "cosmetics": 5.0,
        "clothing": 10.0
    }
    
    normalized_category = product.category.strip().lower()
    multiplier = category_multipliers.get(normalized_category, 5.0)
    estimated_kg_co2 = (product.weight_g / 1000) * multiplier
    
    return {
        "success": True,
        "product": product.product_name,
        "category": product.category,
        "estimated_kg_co2": round(estimated_kg_co2, 2)
    }

# --- ENDPOINT 2: Analytics & Trends ---
@app.post("/api/analytics")
async def get_analytics(data: AnalyticsRequest):
    """
    Processes a user's scan history to calculate trends, top emitting categories, 
    and an overall sustainability score.
    """
    # FIX 2: Return a proper HTTP 422 Error if the array is empty
    if not data.scans:
        raise HTTPException(status_code=422, detail="No scan data provided for analytics.")

    # 1. Calculate Top Emitting Category
    category_totals = {}
    total_emissions = 0.0

    for scan in data.scans:
        cat = scan.category.strip().title()
        category_totals[cat] = category_totals.get(cat, 0.0) + scan.carbon_footprint_kg
        total_emissions += scan.carbon_footprint_kg

    top_category = max(category_totals, key=category_totals.get)
    top_category_pct = (category_totals[top_category] / total_emissions) * 100 if total_emissions > 0 else 0

    # 2. Month-over-Month (MoM) Trend Calculation
    # FIX 3: Make datetime.now() timezone-aware (UTC) to prevent crash
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)
    
    recent_emissions = sum(s.carbon_footprint_kg for s in data.scans if s.scanned_at >= thirty_days_ago)
    older_emissions = sum(s.carbon_footprint_kg for s in data.scans if s.scanned_at < thirty_days_ago)

    if older_emissions > 0:
        mom_change_pct = ((recent_emissions - older_emissions) / older_emissions) * 100
    else:
        mom_change_pct = 0.0

    # 3. Sustainability Score (1-100)
    penalty = (total_emissions / 10.0) * 15  
    score = max(1, min(100, 100 - penalty)) 

    return {
        "success": True,
        "user_id": data.user_id,
        "total_emissions_kg": round(total_emissions, 2),
        "sustainability_score": round(score),
        "top_emitting_category": top_category,
        "top_category_percentage": round(top_category_pct, 1),
        "mom_change_percentage": round(mom_change_pct, 1),
        "trend_direction": "worsening" if mom_change_pct > 0 else "improving"
    }