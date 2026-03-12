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

@router.get("/history/{appointment_id}")
async def get_chat_history(appointment_id: str):
    db = get_db()
    chats = await db.chats.find({"appointment_id": appointment_id}).to_list(1000)
    for chat in chats:
        chat["_id"] = str(chat["_id"])
    return chats

@router.websocket("/ws/chat/{appointment_id}")
async def websocket_endpoint(websocket: WebSocket, appointment_id: str):
    await manager.connect(websocket, appointment_id)
    db = get_db()
    
    # send chat history
    from bson import ObjectId
    try:
        past_chats = await db.chats.find({"appointment_id": appointment_id}).to_list(100)
        for chat in past_chats:
            chat["_id"] = str(chat["_id"])
            await websocket.send_text(json.dumps(chat))
            
        while True:
            data = await websocket.receive_text()
            try:
                # Check timeframe before sending
                appt = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
                if appt:
                    now = datetime.now()
                    start_dt = datetime.strptime(f"{appt['date']} {appt['start_time']}", "%Y-%m-%d %H:%M")
                    if appt.get("end_time"):
                        end_dt = datetime.strptime(f"{appt['date']} {appt['end_time']}", "%Y-%m-%d %H:%M")
                    else:
                        from datetime import timedelta
                        end_dt = start_dt + timedelta(minutes=30)
                        
                    if appt.get("status") == "completed":
                        await websocket.send_text(json.dumps({"error": "This session has been explicitly ended."}))
                        continue

                    if not (start_dt <= now <= end_dt):
                        await websocket.send_text(json.dumps({"error": "Communication is only allowed during the appointment window."}))
                        continue

                payload = json.loads(data)
                
                if payload.get("type") in ["offer", "answer", "ice-candidate", "end-call"]:
                    await manager.broadcast_to_room(data, appointment_id)
                    continue
                
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
            except Exception as e:
                print("WS Error:", e)
    except WebSocketDisconnect:
        manager.disconnect(websocket, appointment_id)

from pydantic import BaseModel
class ChatbotRequest(BaseModel):
    message: str

@router.post("/chatbot")
async def chatbot_endpoint(request: ChatbotRequest):
    response = await process_patient_message(request.message)
    return response
