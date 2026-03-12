import asyncio
from httpx import AsyncClient

async def send_post():
    async with AsyncClient() as client:
        # We need a valid token to test the API correctly, so let's use the db directly
        pass
