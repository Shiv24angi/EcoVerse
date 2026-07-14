from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import update, func
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta, timezone

# Import our new database files
import models
from database import engine, SessionLocal

# Create the database tables automatically when the app starts
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EcoVerse AI Services - Stateful",
    description="Database-driven Carbon Analytics and Gamification",
    version="0.3.0"
)

# --- DATABASE DEPENDENCY ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- MODELS ---
class ProductData(BaseModel):
    product_name: str
    category: str
    weight_g: float = Field(default=100.0, gt=0)

class ScanCreate(BaseModel):
    user_id: str = Field(min_length=1)
    product_name: str
    category: str
    carbon_footprint_kg: float = Field(ge=0)

class LeaderboardRequest(BaseModel):
    requesting_user_id: str = Field(min_length=1)

class AnalyticsRequest(BaseModel):
    user_id: str = Field(min_length=1)

# --- ENDPOINT 1: Estimation ---
@app.post("/api/estimate")
async def estimate_carbon(product: ProductData):
    category_multipliers = {"food": 2.5, "electronics": 15.0, "cosmetics": 5.0, "clothing": 10.0}
    multiplier = category_multipliers.get(product.category.strip().lower(), 5.0)
    estimated_kg_co2 = (product.weight_g / 1000) * multiplier
    
    return {
        "success": True,
        "product": product.product_name,
        "estimated_kg_co2": round(estimated_kg_co2, 2)
    }

# --- ENDPOINT 2: Save a Scan ---
@app.post("/api/scans")
def create_scan(scan_data: ScanCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == scan_data.user_id).first()
    if not user:
        user = models.User(id=scan_data.user_id, total_emissions_kg=0.0)
        db.add(user)
        try:
            db.flush()
        except IntegrityError:
            db.rollback() 
    
    new_scan = models.Scan(
        user_id=scan_data.user_id,
        product_name=scan_data.product_name,
        category=scan_data.category,
        carbon_footprint_kg=scan_data.carbon_footprint_kg
    )
    db.add(new_scan)
    
    db.execute(
        update(models.User)
        .where(models.User.id == scan_data.user_id)
        .values(total_emissions_kg=models.User.total_emissions_kg + scan_data.carbon_footprint_kg)
    )
    
    db.commit()
    
    # Wrap badge evaluation in error handling to prevent scan endpoint failures
    try:
        evaluate_and_award_badges(scan_data.user_id, db)
    except Exception:
        # Badge evaluation is best-effort; scan is already persisted
        db.rollback()

    return {"success": True, "message": "Scan logged to database!"}

# --- ENDPOINT 3: Analytics ---
@app.post("/api/analytics")
def get_analytics(data: AnalyticsRequest, db: Session = Depends(get_db)):
    # FIX: Shifted aggregation entirely into the SQL Database layer
    category_totals = db.query(
        models.Scan.category, 
        func.sum(models.Scan.carbon_footprint_kg).label("total")
    ).filter(models.Scan.user_id == data.user_id).group_by(models.Scan.category).all()
    
    if not category_totals:
        raise HTTPException(status_code=404, detail="No scan history found for this user.")

    total_emissions = sum(row.total for row in category_totals)
    top_category = max(category_totals, key=lambda x: x.total).category.title()

    penalty = (total_emissions / 10.0) * 15  
    score = max(1, min(100, 100 - penalty)) 

    return {
        "success": True,
        "user_id": data.user_id,
        "total_emissions_kg": round(total_emissions, 2),
        "sustainability_score": round(score),
        "top_emitting_category": top_category
    }

# --- ENDPOINT 4: Leaderboard ---
# FIX: Created a helper function so both GET and POST requests can use the engine
def _build_leaderboard(requesting_user_id: str, db: Session):
    total_users = db.query(func.count(models.User.id)).scalar()
    
    if not total_users:
        raise HTTPException(status_code=404, detail="No users in database.")

    requesting_user = db.query(models.User).filter(models.User.id == requesting_user_id).first()
    if not requesting_user:
        raise HTTPException(status_code=404, detail="User not found.")

    req_emissions = requesting_user.total_emissions_kg
    
    user_rank = 1 + db.query(func.count(models.User.id)).filter(models.User.total_emissions_kg < req_emissions).scalar()
    people_beaten = db.query(func.count(models.User.id)).filter(models.User.total_emissions_kg > req_emissions).scalar()
    
    others = total_users - 1
    
    # FIX: Addressed the edge case for a single-user database
    if others > 0:
        percentile = (people_beaten / others) * 100
        status_message = f"You are beating {round(percentile)}% of users!"
    else:
        percentile = 100.0
        status_message = "You're the first user on the leaderboard!"

    top_10_users = db.query(models.User).order_by(models.User.total_emissions_kg.asc()).limit(10).all()
    top_10 = [{"rank": i + 1, "user_id": u.id, "emissions_kg": u.total_emissions_kg} for i, u in enumerate(top_10_users)]

    return {
        "success": True,
        "leaderboard": top_10,
        "stats": {
            "user_rank": user_rank,
            "percentile_score": round(percentile, 1),
            "status_message": status_message
        }
    }

@app.post("/api/leaderboard")
def get_leaderboard_post(data: LeaderboardRequest, db: Session = Depends(get_db)):
    return _build_leaderboard(data.requesting_user_id, db)

# FIX: Added GET compatibility for frontend clients
@app.get("/api/leaderboard")
def get_leaderboard_get(requesting_user_id: str, db: Session = Depends(get_db)):
    return _build_leaderboard(requesting_user_id, db)

# --- ENDPOINT 5: User Profile ---
@app.get("/api/users/{user_id}")
def get_user_profile(user_id: str, db: Session = Depends(get_db), x_caller_id: str = Header(None)):
    
    # 1. SECURITY CHECK: Check if the x_caller_id matches the user_id in the URL
    if ___ != ___:
        raise HTTPException(status_code=403, detail="Not authorized to view this profile.")

    # Fetch the user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    # 2. FLATTEN THE LISTS: Convert the ORM objects into plain dictionaries
    # Hint: Use a list comprehension to grab the fields you want to show the frontend
    safe_scans = [{"product_name": s.product_name, "carbon_footprint_kg": s.carbon_footprint_kg} for s in user.scans]
    safe_badges = [ ___ for b in user.badges ] # <-- You write the list comprehension for badges!

    # 3. NULL FALLBACK: Protect the round() function
    return {
        "success": True,
        "user_id": user.id,
        # Hint: Use 'or 0.0' inside the round function
        "total_emissions_kg": round( ___ , 2), 
        "scans": safe_scans,
        "badges": safe_badges
    }
# --- GAMIFICATION ENGINE ---
def evaluate_and_award_badges(user_id: str, db: Session):
    scan_count = db.query(models.Scan).filter(models.Scan.user_id == user_id).count()

    # Data-driven milestones: easy to add more thresholds later!
    milestones = [
        (1, "first_scan"),
        (10, "ten_scans"),  # Renamed from 'eco_novice' to match frontend requirements
    ]

    for threshold, badge_id in milestones:
        if scan_count >= threshold:
            existing = db.query(models.UserBadge).filter(
                models.UserBadge.user_id == user_id,
                models.UserBadge.badge_id == badge_id,
            ).first()

            if not existing:
                try:
                    db.add(models.UserBadge(user_id=user_id, badge_id=badge_id))
                    db.commit()
                except IntegrityError:
                    # Catch race conditions if the user double-clicks the scan button
                    db.rollback()