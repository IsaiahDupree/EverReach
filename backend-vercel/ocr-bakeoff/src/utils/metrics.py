# src/utils/metrics.py
from typing import Tuple, Dict, Any, List
import math

def _levenshtein(a: str, b: str) -> int:
    if a == b: return 0
    if len(a) == 0: return len(b)
    if len(b) == 0: return len(a)
    v0 = list(range(len(b)+1))
    v1 = [0]*(len(b)+1)
    for i, ca in enumerate(a, start=1):
        v1[0] = i
        for j, cb in enumerate(b, start=1):
            cost = 0 if ca == cb else 1
            v1[j] = min(v1[j-1]+1, v0[j]+1, v0[j-1]+cost)
        v0, v1 = v1, v0
    return v0[len(b)]

def cer(ref: str, hyp: str) -> float:
    if len(ref) == 0: return 0.0 if len(hyp)==0 else 1.0
    return _levenshtein(ref, hyp) / max(1, len(ref))

def prf1(tp: int, fp: int, fn: int) -> Tuple[float,float,float]:
    p = tp / (tp+fp) if (tp+fp)>0 else 0.0
    r = tp / (tp+fn) if (tp+fn)>0 else 0.0
    f1 = 2*p*r / (p+r) if (p+r)>0 else 0.0
    return p, r, f1

def card_field_f1(gt: Dict[str,str], pred: Dict[str,str]) -> Dict[str, Any]:
    # exact-match per field
    out = {}
    for k in ["name","title","company","phone","email","url","address"]:
        g = (gt.get(k) or "").strip().lower()
        p = (pred.get(k) or "").strip().lower()
        tp = 1 if g and p and g==p else 0
        fp = 1 if (p and g!=p) else 0
        fn = 1 if (g and not p) else 0
        out[k] = {"p": (1.0 if tp and not fp else 0.0), "r": (1.0 if tp and not fn else 0.0), "f1": (1.0 if tp else 0.0)}
    # macro average
    f1s = [m["f1"] for m in out.values()]
    out["_macro_f1"] = sum(f1s)/len(f1s) if f1s else 0.0
    return out
