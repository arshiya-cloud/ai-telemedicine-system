import asyncio
from app.database.connection import get_db, connect_to_mongo
import sys

async def check():
    await connect_to_mongo()
    db = get_db()
    slots = await db.slots.find().to_list(100)
    print("Slots in DB:")
    for s in slots:
        print(s)

if __name__ == "__main__":
    asyncio.run(check())
