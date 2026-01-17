# src/adapters/mistral_ocr_adapter.py
import os, time, json, base64, requests
from dotenv import load_dotenv
from .base import OCRAdapter
from ..schema import DocResult, Block, Table, CostSummary, Diagnostics, Classification

load_dotenv()
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY","")
MISTRAL_OCR_MODEL = os.getenv("MISTRAL_OCR_MODEL","mistral-ocr-latest")

def _img_to_b64(path: str) -> str:
    with open(path,"rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

class MistralOCRAdapter(OCRAdapter):
    name = "mistral"
    def process(self, image_path: str, kind: str = "generic_doc") -> DocResult:
        t0 = time.time()
        headers = {"Authorization": f"Bearer {MISTRAL_API_KEY}", "Content-Type":"application/json"}
        # NOTE: Adjust endpoint & payload per current Mistral OCR API docs.
        payload = {
          "model": MISTRAL_OCR_MODEL,
          "input_image_b64": _img_to_b64(image_path),
          "return_format": "normalized_json"  # hoped-for; replace with actual
        }
        r = requests.post("https://api.mistral.ai/v1/ocr", headers=headers, data=json.dumps(payload))
        r.raise_for_status()
        j = r.json()

        # Expect j to contain fields akin to our schema; map conservatively:
        text = j.get("text","")
        blocks = j.get("blocks",[])
        tables = j.get("tables",[])
        entities = j.get("entities",{})

        latency_ms = int((time.time() - t0) * 1000)
        return DocResult(
            document_id="",
            kind=kind,
            text=text,
            blocks=[Block(**b) for b in blocks if isinstance(b, dict) and "text" in b],
            tables=[Table(**t) for t in tables if isinstance(t, dict)],
            entities=entities,
            kv_pairs=[],
            classifications=[Classification(label=kind, score=0.99)],
            redactions=[],
            embeddings=None,
            cost_summary=CostSummary(provider="mistral", pages=1),
            diagnostics=Diagnostics(latency_ms=latency_ms, retries=0, engine_version=self.engine_version),
        )
