#!/bin/bash
set -e

CSV="/data/normativos_cnj_bgem3.csv"
DB="normas"
USER="normas"

# Check if already seeded
COUNT=$(psql -U "$USER" -d "$DB" -t -c "SELECT count(*) FROM normativos;" 2>/dev/null | tr -d ' ')
if [ "$COUNT" -gt "0" ]; then
    echo ">>> normativos already seeded ($COUNT rows). Skipping."
    exit 0
fi

if [ ! -f "$CSV" ]; then
    echo ">>> CSV not found at $CSV — skipping seed."
    exit 0
fi

echo ">>> Starting CSV import into normativos..."

python3 << 'PYEOF'
import csv
import json
import psycopg2
import sys
import time

CSV_PATH = "/data/normativos_cnj_bgem3.csv"
DSN = "dbname=normas user=normas"

conn = psycopg2.connect(DSN)
cur = conn.cursor()

start = time.time()
batch = []
BATCH_SIZE = 500
total = 0

with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter=";", quotechar='"')
    for row in reader:
        doc_id = row.get("id", "").strip()
        document = row.get("document", "").strip()
        metadata = row.get("metadata", "{}").strip()
        embedding_str = row.get("embedding", "").strip()
        created_at = row.get("created_at", None)

        if not doc_id or not document:
            continue

        # Parse metadata as JSON (it may have escaped quotes and newlines)
        try:
            cleaned_meta = metadata.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            meta_json = json.loads(cleaned_meta)
        except Exception as e:
            # print("Meta parse error on id:", doc_id, e)
            meta_json = {}

        # Embedding already comes as [x,y,z,...] from CSV - use as-is
        emb = embedding_str if embedding_str else None

        batch.append((doc_id, document, json.dumps(meta_json, ensure_ascii=False), emb, created_at))
        total += 1

        if len(batch) >= BATCH_SIZE:
            args_str = ",".join(
                cur.mogrify("(%s, %s, %s::jsonb, %s::vector, %s::timestamp)", b).decode()
                for b in batch
            )
            cur.execute(
                "INSERT INTO normativos (id, document, metadata, embedding, created_at) VALUES "
                + args_str
                + " ON CONFLICT (id) DO NOTHING"
            )
            conn.commit()
            elapsed = time.time() - start
            print(f"  ... {total} rows ({elapsed:.1f}s)", flush=True)
            batch = []

# Remaining batch
if batch:
    args_str = ",".join(
        cur.mogrify("(%s, %s, %s::jsonb, %s::vector, %s::timestamp)", b).decode()
        for b in batch
    )
    cur.execute(
        "INSERT INTO normativos (id, document, metadata, embedding, created_at) VALUES "
        + args_str
        + " ON CONFLICT (id) DO NOTHING"
    )
    conn.commit()

elapsed = time.time() - start
print(f">>> Import complete: {total} rows in {elapsed:.1f}s")

cur.close()
conn.close()
PYEOF

echo ">>> Seed done."
