from fastapi import FastAPI

app = FastAPI(title="CoreShield API")

@app.get("/")
def read_root():
    return {"message": "CoreShield backend is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
