import asyncio
from app.database.connection import get_db, connect_to_mongo
from pprint import pprint

async def check_appts():
    await connect_to_mongo()
    db = get_db()
    appts = await db.appointments.find().to_list(10)
    print("Total appointments:", len(appts))
    pprint(appts)

asyncio.run(check_appts())
