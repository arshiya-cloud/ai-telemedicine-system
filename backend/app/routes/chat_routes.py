from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from app.database.connection import get_db
from app.services.ai_service import process_patient_message
import json
from datetime import datetime

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections and websocket in self.active_connections[room_id]:
            self.active_connections[room_id].remove(websocket)

    async def broadcast_to_room(self, message: str, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/chat/{appointment_id}")
async def websocket_endpoint(websocket: WebSocket, appointment_id: str):
    await manager.connect(websocket, appointment_id)
    db = get_db()
    
    # send chat history
    try:
        past_chats = await db.chats.find({"appointment_id": appointment_id}).to_list(100)
        for chat in past_chats:
            chat["_id"] = str(chat["_id"])
            await websocket.send_text(json.dumps(chat))
            
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                
                chat_msg = {
                    "appointment_id": appointment_id,
                    "sender": payload.get("sender", "unknown"),
                    "message": payload.get("message", ""),
                    "timestamp": datetime.utcnow().isoformat()
                }
                res = await db.chats.insert_one(chat_msg)
                
                chat_msg["_id"] = str(res.inserted_id)
                await manager.broadcast_to_room(json.dumps(chat_msg), appointment_id)
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, appointment_id)

from pydantic import BaseModel
class ChatbotRequest(BaseModel):
    message: str

@router.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest):
    response = await process_patient_message(request.message)
    return {"reply": response}
