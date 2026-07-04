import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from config import settings
from routers import titles, search, person, assistant, analytics
from analytics.engine import get_netflix_data, init_search_indexing

app = FastAPI(
    title="Netflix Business Intelligence API",
    description="Python FastAPI analytics and integration backend for Netflix Analytics dashboard",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip compression (highly recommended for the 27MB thinned titles database)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Include routers
app.include_router(titles.router)
app.include_router(search.router)
app.include_router(person.router)
app.include_router(assistant.router)
app.include_router(analytics.router)

@app.on_event("startup")
def startup_event():
    print("[API Server] Warm-up: Pre-parsing CSV and building search index...")
    # Load dataset to memory cache
    data = get_netflix_data()
    print(f"[API Server] Pre-loaded {len(data)} catalog items.")
    # Warm up search index
    init_search_indexing()
    print("[API Server] Search index initialized successfully.")

@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "FastAPI + Pandas"}

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
