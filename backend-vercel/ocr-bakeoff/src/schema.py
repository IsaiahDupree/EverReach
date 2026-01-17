# src/schema.py
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
import time, uuid

BBox = List[float]  # [x, y, w, h]

class Block(BaseModel):
    bbox: Optional[BBox] = None
    conf: Optional[float] = None
    text: str

class TableCell(BaseModel):
    r: int
    c: int
    text: str
    bbox: Optional[BBox] = None
    conf: Optional[float] = None

class Table(BaseModel):
    cells: List[TableCell] = Field(default_factory=list)

class KVP(BaseModel):
    key: str
    value: str
    bbox: Optional[BBox] = None
    conf: Optional[float] = None

class Classification(BaseModel):
    label: str
    score: float

class Redaction(BaseModel):
    type: str
    span: Tuple[int, int]

class CostSummary(BaseModel):
    provider: str
    input_tokens: int = 0
    output_tokens: int = 0
    pages: int = 1

class Diagnostics(BaseModel):
    latency_ms: int = 0
    retries: int = 0
    engine_version: str = ""

class DocResult(BaseModel):
    document_id: str
    kind: str
    text: str = ""
    blocks: List[Block] = Field(default_factory=list)
    tables: List[Table] = Field(default_factory=list)
    entities: Dict[str, Optional[str]] = Field(default_factory=dict)
    kv_pairs: List[KVP] = Field(default_factory=list)
    classifications: List[Classification] = Field(default_factory=list)
    redactions: List[Redaction] = Field(default_factory=list)
    embeddings: Optional[List[float]] = None
    cost_summary: CostSummary
    diagnostics: Diagnostics

def new_doc_id(path_or_bytes: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, path_or_bytes))

def now_ms() -> int:
    return int(time.time() * 1000)
