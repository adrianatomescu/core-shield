from dataclasses import dataclass


@dataclass
class User:
    id: int
    email: str
    role: str
    enabled: bool
