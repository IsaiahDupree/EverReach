# src/adapters/base.py
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from ..schema import DocResult, CostSummary, Diagnostics, new_doc_id

class OCRAdapter(ABC):
    name: str

    def __init__(self, engine_version: str = ""):
        self.engine_version = engine_version or self.__class__.__name__

    @abstractmethod
    def process(self, image_path: str, kind: str = "generic_doc") -> DocResult:
        ...

    # Helper to construct base result
    def _base(self, image_path: str, kind: str, provider: str) -> Dict[str, Any]:
        return dict(
            document_id=new_doc_id(image_path),
            kind=kind,
            text="",
            blocks=[],
            tables=[],
            entities={},
            kv_pairs=[],
            classifications=[],
            redactions=[],
            embeddings=None,
            cost_summary=CostSummary(provider=provider).model_dump(),
            diagnostics=Diagnostics(engine_version=self.engine_version).model_dump(),
        )
