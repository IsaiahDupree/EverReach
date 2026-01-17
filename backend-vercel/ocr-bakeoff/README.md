# ocr-bakeoff

Bake-off harness comparing **Local OCR (PaddleOCR + Tesseract)** vs **OpenAI Vision** vs **Mistral OCR** for screenshots, business cards, email images, and mixed docs.

## Repo Layout

```
.
├─ README.md
├─ requirements.txt
├─ .env.example
├─ src/
│  ├─ schema.py
│  ├─ adapters/
│  │  ├─ base.py
│  │  ├─ local_ocr_adapter.py
│  │  ├─ openai_vision_adapter.py
│  │  └─ mistral_ocr_adapter.py
│  ├─ utils/
│  │  ├─ io.py
│  │  └─ metrics.py
│  └─ run_infer.py
└─ eval/
   └─ evaluate.py
```

## Quickstart

1) **System deps (local OCR):**
   - Install Tesseract binary (e.g., Ubuntu: `sudo apt-get install tesseract-ocr` | macOS: `brew install tesseract`).
   - Optional: language packs as needed.

2) **Python deps:**

```bash
python -m venv .venv && source .venv/bin/activate   # Win: .venv\Scripts\activate
pip install -r requirements.txt
```

3) **Secrets:**

Copy `.env.example` → `.env`, add `OPENAI_API_KEY` and `MISTRAL_API_KEY` if you plan to run cloud adapters.

## Running Inference

**Single file:**

```bash
python -m src.run_infer --image demo/card_01.jpg --kind business_card --provider local
python -m src.run_infer --image demo/ui_01.png --kind screenshot --provider openai
python -m src.run_infer --image demo/doc_01.png --kind generic_doc --provider mistral
```

**Batch (folder):**

```bash
python -m src.run_infer --folder demo/cards --kind business_card --provider local --out results_local.jsonl
```

## Normalized Output (excerpt)

Each adapter returns the same shape:

```json
{
  "document_id": "uuid",
  "kind": "business_card|screenshot|email_image|generic_doc",
  "text": "...",
  "blocks": [{"bbox":[x,y,w,h],"conf":0.99,"text":"..."}],
  "tables": [{"cells":[{"r":0,"c":0,"text":"...", "bbox":[...]}]}],
  "entities": {"name": "...", "title":"...", "company":"...", "phone":"...", "email":"...", "url":"...", "address":"..."},
  "kv_pairs": [{"key":"...", "value":"...", "bbox":[...], "conf":0.93}],
  "classifications": [{"label":"...", "score":0.97}],
  "redactions": [{"type":"EMAIL","span":[s,e]}],
  "embeddings": null,
  "cost_summary": {"provider":"local|openai|mistral","input_tokens":0,"output_tokens":0,"pages":1},
  "diagnostics": {"latency_ms": 0, "retries": 0, "engine_version":"..."}
}
```

## Evaluation

Prepare a dataset directory like:

```
dataset/
  screenshots/*.png
  business_cards/*.jpg
  email_images/*.png
  generic_docs/*.png
labels/
  business_cards.jsonl        # {image:"...", entities:{name:...,email:...}}
  text_gt.jsonl               # {image:"...", text:"..."}  (for CER/WER)
  tables_gt.jsonl             # optional table structure annotations
  pii_spans.jsonl             # optional PII labels
```

Run:

```bash
python -m eval.evaluate \
  --results results_local.jsonl \
  --text-gt labels/text_gt.jsonl \
  --card-gt labels/business_cards.jsonl
```

Outputs a summary with CER/WER, field-level precision/recall/F1, simple layout IoU, and latency stats.

## Notes

- Local OCR is cost-optimal and fast in batch; quality jumps with pre/post (deskew, binarize, validators).
- OpenAI Vision & Mistral OCR excel on complex layouts and screenshots/UI semantics.
- Keep all writes idempotent (document_id = UUID5(path)) so you can re-run safely.
