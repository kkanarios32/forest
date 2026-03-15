import json
import re
from pathlib import Path

BOOK_RE = re.compile(r"^THE\s+([A-Z]+)\s+BOOK\s*$")
SECTION_RE = re.compile(r"^([IVXLCDM]+)\.\s*(.*)$")

ROMAN_MAP = {
    "FIRST": 1,
    "SECOND": 2,
    "THIRD": 3,
    "FOURTH": 4,
    "FIFTH": 5,
    "SIXTH": 6,
    "SEVENTH": 7,
    "EIGHTH": 8,
    "NINTH": 9,
    "TENTH": 10,
    "ELEVENTH": 11,
    "TWELFTH": 12,
}


def roman_to_int(s: str) -> int:
    values = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    prev = 0
    for ch in reversed(s):
        v = values[ch]
        if v < prev:
            total -= v
        else:
            total += v
            prev = v
    return total


def normalize_whitespace(text: str) -> str:
    # Join wrapped lines into a single paragraph-like string
    return re.sub(r"\s+", " ", text).strip()


def parse_meditations(text: str) -> list[dict]:
    passages = []

    current_book = None
    current_section_roman = None
    current_section_text_parts = []

    def flush_current():
        nonlocal current_book, current_section_roman, current_section_text_parts
        if current_book is not None and current_section_roman is not None:
            raw_text = " ".join(current_section_text_parts)
            passages.append(
                {
                    "id": len(passages),
                    "book": current_book,
                    "section": roman_to_int(current_section_roman),
                    "section_roman": current_section_roman,
                    "text": normalize_whitespace(raw_text),
                }
            )
        current_section_roman = None
        current_section_text_parts = []

    for raw_line in text.splitlines():
        line = raw_line.strip()

        # Skip empty lines
        if not line:
            continue

        # New book
        book_match = BOOK_RE.match(line)
        if book_match:
            flush_current()
            word = book_match.group(1)
            current_book = ROMAN_MAP[word]
            continue

        # New section
        section_match = SECTION_RE.match(line)
        if section_match:
            flush_current()
            current_section_roman = section_match.group(1)
            first_text = section_match.group(2).strip()
            current_section_text_parts = [first_text] if first_text else []
            continue

        # Continuation of current section text
        if current_section_roman is not None:
            current_section_text_parts.append(line)

    flush_current()
    return passages


if __name__ == "__main__":
    input_path = Path("meditations.txt")
    output_path = Path("meditations_passages.json")

    text = input_path.read_text(encoding="utf-8")
    passages = parse_meditations(text)

    output_path.write_text(
        json.dumps(passages, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Wrote {len(passages)} passages to {output_path}")
