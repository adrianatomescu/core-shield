from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import analyst, auth, security_engineer, users

app = FastAPI(title="CoreShield API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else None
    if first_error is None:
        message = "Invalid request payload."
    else:
        message = first_error.get("msg", "Invalid request payload.")

    return JSONResponse(
        status_code=422,
        content={"detail": message},
    )


@app.get("/")
def read_root():
    return {"message": "CoreShield backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(security_engineer.router)
app.include_router(analyst.router)
