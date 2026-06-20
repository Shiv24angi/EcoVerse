from fastapi import FastAPI
from pydantic import BaseModel, Field

# Initialize the API
app = FastAPI(
    title="EcoVerse AI Carbon Estimator",
    description="Microservice to calculate product carbon footprints",
    version="0.1.0"
)

# Define the exact data structure we expect to receive
class ProductData(BaseModel):
    product_name: str
    category: str
    barcode: str | None = None
    # FIX 1: Ensure weight is strictly greater than 0
    weight_g: float = Field(default=100.0, gt=0) 

@app.post("/api/estimate")
async def estimate_carbon(product: ProductData):
    """
    Takes product data and returns an estimated carbon footprint.
    """
    # FIX 2A: Change all dictionary keys to lowercase
    category_multipliers = {
        "food": 2.5,
        "electronics": 15.0,
        "cosmetics": 5.0,
        "clothing": 10.0
    }
    
    # FIX 2B: Normalize the incoming text (strip spaces, make lowercase)
    normalized_category = product.category.strip().lower()
    
    # Calculate the estimate using the clean data
    multiplier = category_multipliers.get(normalized_category, 5.0)
    estimated_kg_co2 = (product.weight_g / 1000) * multiplier
    
    return {
        "success": True,
        "product": product.product_name,
        "category": product.category, # Return original untouched string
        "estimated_kg_co2": round(estimated_kg_co2, 2),
        "confidence_score": 0.85,
        "engine": "v1_rule_based"
    }