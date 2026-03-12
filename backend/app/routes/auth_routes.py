import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.models.user_model import UserCreate, UserLogin, Token
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.database.connection import get_db

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_FOLDER", "app/uploads")

@router.post("/register/patient")
async def register_patient(user: UserCreate):
    db = get_db()
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["role"] = "patient"
    
    result = await db.users.insert_one(user_dict)
    return {"message": "Patient registered successfully", "id": str(result.inserted_id)}

@router.post("/register/doctor")
async def register_doctor(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    specialization: str = Form(...),
    available_days: str = Form("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday"),
    start_time: str = Form("09:00"),
    end_time: str = Form("17:00"),
    slot_duration: int = Form(30),
    consultation_fee: int = Form(500),
    license_doc: UploadFile = File(...)
):
    db = get_db()
    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Use forward slash to ensure consistent and valid URLs when saved to DB
    doc_path = f"{UPLOAD_DIR}/{license_doc.filename}"
    with open(doc_path, "wb") as f:
        f.write(await license_doc.read())
        
    user_dict = {
        "name": name,
        "email": email,
        "password": get_password_hash(password),
        "role": "doctor",
        "specialization": specialization.strip().lower(),
        "available_days": available_days,
        "start_time": start_time,
        "end_time": end_time,
        "slot_duration": slot_duration,
        "consultation_fee": consultation_fee,
        "license_doc": doc_path,
        "status": "pending"  # Needs admin approval
    }
    
    result = await db.users.insert_one(user_dict)
    return {"message": "Doctor registered successfully. Pending admin approval.", "id": str(result.inserted_id)}

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    db = get_db()
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if db_user["role"] == "doctor" and db_user.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Account pending admin approval")

    access_token = create_access_token(
        data={"user_id": str(db_user["_id"]), "role": db_user["role"]}
    )
    return {"access_token": access_token, "token_type": "bearer", "role": db_user["role"], "user_id": str(db_user["_id"]), "name": db_user.get("name", "User")}
