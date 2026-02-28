import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

class Database:
    client: AsyncIOMotorClient = None
    db = None

database = Database()

async def connect_to_mongo():
    database.client = AsyncIOMotorClient(MONGO_URI)
    database.db = database.client.telemedicine
    print("Connected to MongoDB")

async def close_mongo_connection():
    if database.client:
        database.client.close()
        print("Closed MongoDB connection")

def get_db():
    return database.db
