from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

# Hỗ trợ ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid objectid')
        return ObjectId(v)

class HistoricalDataModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    year: Optional[int]
    embedding: Optional[List[float]] = []
    additionalInfo: Optional[dict] = {}

    class Config:
        allow_population_by_field_name = True
        json_encoders = { ObjectId: str }

class QueryModel(BaseModel):
    query: str
    top_k: Optional[int] = 5
    threshold: Optional[float] = 0.6
from pydantic import BaseModel, Field
from typing import List, Optional
from bson import ObjectId

# Hỗ trợ ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError('Invalid objectid')
        return ObjectId(v)

class HistoricalDataModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    type: str
    description: str
    year: Optional[int]
    embedding: Optional[List[float]] = []
    additionalInfo: Optional[dict] = {}

    class Config:
        allow_population_by_field_name = True
        json_encoders = { ObjectId: str }

class QueryModel(BaseModel):
    query: str
    top_k: Optional[int] = 5
    threshold: Optional[float] = 0.6
