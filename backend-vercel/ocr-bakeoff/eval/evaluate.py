# eval/evaluate.py
import argparse, json, statistics
from collections import defaultdict
from src.utils.io import read_jsonl
from src.utils.metrics import cer, card_field_f1

def load_gt_text(path):
    d = {}
    for r in read_jsonl(path):
        d[r["image"]] = r["text"]
    return d

def load_gt_cards(path):
    d = {}
    for r in read_jsonl(path):
        d[r["image"]] = r.get("entities", {})
    return d

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", required=True)
    ap.add_argument("--text-gt", help="jsonl with {image, text}")
    ap.add_argument("--card-gt", help="jsonl with {image, entities{...}}")
    args = ap.parse_args()

    results = list(read_jsonl(args.results))
    # CER / WER-like (CER only for simplicity)
    cer_scores = []
    if args.text_gt:
        gt_text = load_gt_text(args.text_gt)
        for r in results:
            img = r.get("document_id", r.get("image",""))
            ref = gt_text.get(img, "")
            hyp = r.get("text","")
            cer_scores.append(cer(ref, hyp))
    # Card field F1
    card_scores = defaultdict(list)
    macro_f1s = []
    if args.card_gt:
        gt_cards = load_gt_cards(args.card_gt)
        for r in results:
            img = r.get("document_id", r.get("image",""))
            pred = r.get("entities", {})
            f = card_field_f1(gt_cards.get(img, {}), pred)
            macro_f1s.append(f["_macro_f1"])
            for k,v in f.items():
                if k.startswith("_"): continue
                card_scores[k].append(v["f1"])

    # Latency
    latencies = [r.get("diagnostics",{}).get("latency_ms") for r in results if r.get("diagnostics")]

    summary = {
        "n": len(results),
        "cer_mean": (sum(cer_scores)/len(cer_scores)) if cer_scores else None,
        "cer_p50": (statistics.median(cer_scores) if cer_scores else None),
        "cer_p95": (statistics.quantiles(cer_scores, n=100)[94] if len(cer_scores)>=100 else None),
        "card_macro_f1_mean": (sum(macro_f1s)/len(macro_f1s)) if macro_f1s else None,
        "card_field_f1_means": {k: (sum(v)/len(v) if v else None) for k,v in card_scores.items()},
        "latency_ms_p50": (statistics.median(latencies) if latencies else None),
        "latency_ms_p95": (statistics.quantiles(latencies, n=100)[94] if len(latencies)>=100 else None),
    }
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
