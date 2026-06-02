from pydantic import BaseModel, Field


class AuditorReportCreate(BaseModel):
    title: str = Field(min_length=3)
    report_type: str
    description: str = Field(min_length=3)
    recommendation: str = ""


class AuditorReportStatusUpdate(BaseModel):
    status: str
