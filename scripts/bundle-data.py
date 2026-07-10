#!/usr/bin/env python3
"""data/*.json → js/portfolio-data.js (file:// 더블클릭용 번들)"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = [
    "profile", "projects", "skills", "education", "experience",
    "certificates", "training", "awards", "seo", "theme",
    "resumes", "documents", "images",
]

def main():
    data = {}
    for key in KEYS:
        path = os.path.join(ROOT, "data", f"{key}.json")
        with open(path, encoding="utf-8") as f:
            data[key] = json.load(f)
    out = os.path.join(ROOT, "js", "portfolio-data.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("/** Auto-generated — file:// fallback. Run: python scripts/bundle-data.py */\n")
        f.write("window.__PORTFOLIO_RAW__ = ")
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write(";\n")
    print(f"OK: {out}")

if __name__ == "__main__":
    main()
