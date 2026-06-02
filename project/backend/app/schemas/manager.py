from pydantic import BaseModel, Field


class ManagerTaskCreate(BaseModel):
    title: str = Field(min_length=3)
    description: str = ""
    priority: str
    assignee_email: str
    due_at: str


class ManagerTaskApprovalUpdate(BaseModel):
    approval_status: str


class ManagerLeaveStatusUpdate(BaseModel):
    status: str


class ManagerReportCreate(BaseModel):
    title: str = Field(min_length=3)
    report_type: str
    description: str = Field(min_length=3)
    recommendation: str = ""


class ManagerReportStatusUpdate(BaseModel):
    status: str
