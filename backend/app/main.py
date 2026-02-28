from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routes import auth_routes, doctor_routes, patient_routes, appointment_routes, payment_routes, chat_routes, admin_routes
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Telemedicine Platform API")

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(auth_routes.router, prefix="/api/auth", tags=["auth"])
app.include_router(doctor_routes.router, prefix="/api/doctor", tags=["doctor"])
app.include_router(patient_routes.router, prefix="/api/patient", tags=["patient"])
app.include_router(appointment_routes.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(payment_routes.router, prefix="/api/payment", tags=["payment"])
app.include_router(chat_routes.router, prefix="/api/chat", tags=["chat"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
async def root():
    return {"message": "Welcome to Telemedicine API"}
