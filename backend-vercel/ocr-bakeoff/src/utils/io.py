# src/utils/io.py
import os, json, uuid
from typing import Iterable, Dict, Any

def list_images(folder: str):
    exts = {".png",".jpg",".jpeg",".tif",".tiff",".webp",".bmp",".gif"}
    for root, _, files in os.walk(folder):
        for f in files:
            if os.path.splitext(f.lower())[1] in exts:
                yield os.path.join(root, f)

def write_jsonl(path: str, rows: Iterable[Dict[str, Any]]):
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

def read_jsonl(path: str):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                yield json.loads(line)
