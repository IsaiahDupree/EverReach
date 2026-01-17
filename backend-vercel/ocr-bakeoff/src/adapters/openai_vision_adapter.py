# src/adapters/openai_vision_adapter.py
import base64, time, os, json, requests
from dotenv import load_dotenv
from .base import OCRAdapter
from ..schema import DocResult, Block, Table, CostSummary, Diagnostics, Classification

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

PROMPT_JSON = (
    "You are an OCR & layout extractor. Return strict JSON with keys: "
    "{text, blocks:[{bbox,conf,text}], tables:[{cells:[{r,c,text}]}], "
    "entities:{name,title,company,phone,email,url,address}}. "
    "Use nulls if unknown. No prose."
)

def _img_to_b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

class OpenAIVisionAdapter(OCRAdapter):
    name = "openai"
    def process(self, image_path: str, kind: str = "generic_doc") -> DocResult:
        t0 = time.time()
        img_b64 = _img_to_b64(image_path)

        # Using Chat Completions-style HTTP call for image + text
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {
          "model": OPENAI_MODEL,
          "messages": [
            {"role":"system","content":"You convert images into structured JSON."},
            {"role":"user","content":[
              {"type":"text","text":PROMPT_JSON},
              {"type":"image_url","image_url":{"url": f"data:image/png;base64,{img_b64}"}}
            ]}
          ],
          "temperature": 0
        }
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, data=json.dumps(payload))
        resp.raise_for_status()
        data = resp.json()

        content = data["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"text": content, "blocks": [], "tables": [], "entities": {}}

        usage = data.get("usage", {})
        latency_ms = int((time.time() - t0) * 1000)

        return DocResult(
            document_id="",
            kind=kind,
            text=parsed.get("text",""),
            blocks=[Block(**b) for b in parsed.get("blocks",[]) if isinstance(b, dict) and "text" in b],
            tables=[Table(**t) for t in parsed.get("tables",[]) if isinstance(t, dict)],
            entities=parsed.get("entities",{}),
            kv_pairs=[],
            classifications=[Classification(label=kind, score=0.99)],
            redactions=[],
            embeddings=None,
            cost_summary=CostSummary(
                provider="openai",
                input_tokens=int(usage.get("prompt_tokens",0)),
                output_tokens=int(usage.get("completion_tokens",0)),
                pages=1
            ),
            diagnostics=Diagnostics(latency_ms=latency_ms, retries=0, engine_version=self.engine_version),
        )
