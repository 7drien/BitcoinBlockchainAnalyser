from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from apps.api.routes import forensics, graph, investigations, logs, search, status

load_dotenv()

app = FastAPI(
    title="ChainScope API",
    description="A local-first Bitcoin transaction graph explorer and forensic analysis platform.",
    version="0.1.0",
)

# Register feature routers
app.include_router(search.router)
app.include_router(logs.router)
app.include_router(status.router)
app.include_router(graph.router)
app.include_router(forensics.router)
app.include_router(investigations.router)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> JSONResponse:
    return JSONResponse({"status": "ok", "service": "chainscope-api"})


@app.get("/")
async def root() -> JSONResponse:
    return JSONResponse({"message": "Welcome to ChainScope API"})
