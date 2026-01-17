# src/adapters/local_ocr_adapter.py
import cv2, numpy as np, pytesseract, time
from PIL import Image
from paddleocr import PaddleOCR
from typing import List
from .base import OCRAdapter
from ..schema import DocResult, Block, Table, TableCell, KVP, Classification, Redaction, CostSummary, Diagnostics

def _read_bgr(path: str):
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(path)
    return img

def _preprocess(img):
    # orientation & binarize light touch (tune as needed)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # simple adaptive threshold helps Tesseract on low-contrast scans
    th = cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY, 41, 11)
    return th

class LocalOCRAdapter(OCRAdapter):
    name = "local"
    def __init__(self, lang: str = "eng", use_paddle: bool = True):
        super().__init__(engine_version=f"paddle={use_paddle},tesseract=1")
        self.lang = lang
        self.use_paddle = use_paddle
        self._paddle = PaddleOCR(use_angle_cls=True, lang='en') if use_paddle else None

    def process(self, image_path: str, kind: str = "generic_doc") -> DocResult:
        t0 = time.time()
        img_bgr = _read_bgr(image_path)
        prep = _preprocess(img_bgr)

        blocks: List[Block] = []
        text_parts: List[str] = []

        # Try PaddleOCR first (det + rec)
        if self._paddle:
            ocr_res = self._paddle.ocr(prep, cls=True)
            for line in ocr_res[0]:
                (x0,y0),(x1,y1),(x2,y2),(x3,y3) = line[0]
                x, y, w, h = float(x0), float(y0), float(x2-x0), float(y2-y0)
                s, conf = line[1][0], float(line[1][1])
                blocks.append(Block(bbox=[x,y,w,h], conf=conf, text=s))
                text_parts.append(s)

        # Fallback or enrichment with Tesseract (can improve recall)
        try:
            tess_txt = pytesseract.image_to_string(Image.fromarray(prep), lang=self.lang)
            if tess_txt:
                text_parts.append(tess_txt.strip())
        except Exception:
            pass

        text = "\n".join([t for t in text_parts if t.strip()])
        latency_ms = int((time.time() - t0) * 1000)

        result = DocResult(
            document_id="",
            kind=kind,
            text=text,
            blocks=blocks,
            tables=[Table(cells=[])],                # (optional: add table detection/repair)
            entities={},                             # (optional: add regex-based card/email extractors)
            kv_pairs=[],
            classifications=[Classification(label=kind, score=0.99)],
            redactions=[],                           # (optional: add PII mask pass)
            embeddings=None,
            cost_summary=CostSummary(provider="local"),
            diagnostics=Diagnostics(latency_ms=latency_ms, retries=0, engine_version=self.engine_version),
        )
        # fix document_id last to keep pydantic strict
        result.document_id = result.document_id or f"{result.kind}:{latency_ms}"
        return result
