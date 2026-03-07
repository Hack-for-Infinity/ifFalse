from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import auth, summarize, feedback, settings, subscription


app = FastAPI(
    title="NeuroRead API",
    description="Backend API for the NeuroRead ADHD reading assistant",
    version="0.1.0",
)

# CORS — allow Chrome extension and dashboard origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",       # Dashboard dev
        "chrome-extension://*",        # Chrome extension
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(summarize.router)
app.include_router(feedback.router)
app.include_router(settings.router)
app.include_router(subscription.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "NeuroRead API is running"}

