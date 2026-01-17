# src/run_infer.py
import argparse, os, json
from dotenv import load_dotenv
from .adapters.local_ocr_adapter import LocalOCRAdapter
from .adapters.openai_vision_adapter import OpenAIVisionAdapter
from .adapters.mistral_ocr_adapter import MistralOCRAdapter
from .utils.io import list_images, write_jsonl

load_dotenv()

ADAPTERS = {
    "local": LocalOCRAdapter(),
    "openai": OpenAIVisionAdapter(),
    "mistral": MistralOCRAdapter(),
}

def run_one(image: str, kind: str, provider: str):
    adapter = ADAPTERS[provider]
    res = adapter.process(image, kind=kind).model_dump()
    res["document_id"] = res.get("document_id") or image   # ensure non-empty
    return res

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", help="path to image")
    ap.add_argument("--folder", help="folder of images")
    ap.add_argument("--kind", default="generic_doc",
                    choices=["business_card","screenshot","email_image","generic_doc"])
    ap.add_argument("--provider", required=True, choices=list(ADAPTERS.keys()))
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    rows = []
    if args.image:
        rows.append(run_one(args.image, args.kind, args.provider))
    elif args.folder:
        for p in list_images(args.folder):
            rows.append(run_one(p, args.kind, args.provider))
    else:
        ap.error("Provide --image or --folder")

    outpath = args.out or f"results_{args.provider}.jsonl"
    write_jsonl(outpath, rows)
    print(f"Wrote {len(rows)} rows → {outpath}")

if __name__ == "__main__":
    main()
