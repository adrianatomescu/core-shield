from pydantic import BaseModel


class AnalystChartCreate(BaseModel):
    title: str
    dataset: str
    type: str
