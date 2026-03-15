import random
import json
from pathlib import Path

PASSAGES_FILE = Path("meditations_passages.json")
READ_FILE = Path("read.json")

# load passages
with PASSAGES_FILE.open() as f:
    passages = json.load(f)

# load read ids (or initialize if file doesn't exist)
if READ_FILE.exists():
    with READ_FILE.open() as f:
        read = set(json.load(f))
else:
    read = set()

# find unread passages
unread = [p for p in passages if p["id"] not in read]

if not unread:
    print("You have read all passages!")
    exit()

# choose one
today = random.choice(unread)

print(f"Book {today['book']}, Section {today['section']}\n")
print(today["text"])

# update read list
read.add(today["id"])

with READ_FILE.open("w") as f:
    json.dump(sorted(read), f, indent=2)
