#!/usr/bin/env python3
r"""Print a Forester 'quote of the day' paragraph from Marcus Aurelius'
Meditations, and mark it read so it won't recur until the corpus is exhausted.

Paths resolve relative to this file, so it runs from any working directory.
Prefers short passages (a pithier daily quote), falling back to the full unread
pool once every short one has been seen. Passages containing Forester-special
characters are skipped so the emitted block always parses.

  quote_of_the_day.py            pick, print, and mark read (the daily use)
  quote_of_the_day.py --peek     print without marking read (for testing)
"""
import json
import random
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PASSAGES_FILE = HERE / "meditations_passages.json"
READ_FILE = HERE / "read.json"

SHORT_MAX = 350                 # chars — keep the daily quote pithy
RISKY = set("\\{}#%$&~")        # Forester-significant; skip passages using these

# The corpus was parsed straight from Project Gutenberg, so translator
# footnotes ('"Plato" (23): Theaetetus, p. 174 D.') got captured as passages.
# They carry tell-tale markers — a numbered note ref, a page/fragment citation
# — that real Meditations prose never does. Skip anything matching.
FOOTNOTE = re.compile(
    r"\(\d+\)|\bp\.\s*\d|\bfrag\.|A translation of|A quotation from|Nauck|compare ")


def forester_safe(text):
    # Collapse whitespace and neutralise brackets so a stray [word] editorial
    # insertion is never parsed as Forester link syntax.
    return " ".join(text.split()).replace("[", "(").replace("]", ")")


def main():
    peek = "--peek" in sys.argv[1:]
    if not PASSAGES_FILE.exists():
        return
    passages = json.loads(PASSAGES_FILE.read_text(encoding="utf-8"))
    read = (set(json.loads(READ_FILE.read_text(encoding="utf-8")))
            if READ_FILE.exists() else set())

    unread = [p for p in passages
              if p["id"] not in read
              and not (RISKY & set(p["text"]))
              and not FOOTNOTE.search(p["text"])]
    if not unread:
        return
    pool = [p for p in unread if len(p["text"]) <= SHORT_MAX] or unread
    q = random.choice(pool)

    print("\\p{")
    print(f"\\em{{{forester_safe(q['text'])}}} — \\strong{{Marcus Aurelius}}, "
          f"\\em{{Meditations}}, Book {q['book']} §{q['section']}")
    print("}")

    if not peek:
        read.add(q["id"])
        READ_FILE.write_text(json.dumps(sorted(read), indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
