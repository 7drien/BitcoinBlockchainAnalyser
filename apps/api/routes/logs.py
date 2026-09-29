import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/api/logs", tags=["logs"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)


manager = ConnectionManager()


class WebsocketLogHandler(logging.Handler):
    def emit(self, record):
        try:
            msg = self.format(record)
            # Use asyncio to schedule the broadcast
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(manager.broadcast(msg))
            except RuntimeError:
                pass
        except Exception:
            self.handleError(record)


ws_handler = WebsocketLogHandler()
ws_handler.setFormatter(
    logging.Formatter("%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
)
logging.getLogger().addHandler(ws_handler)
# Make sure httpx logs don't spam everything
logging.getLogger("httpx").setLevel(logging.WARNING)


@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
