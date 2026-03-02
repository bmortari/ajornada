import csv
import json
import psycopg2
import sys
import time
from psycopg2.extras import execute_values

CSV_PATH = "/home/brunomortari/chatnormas/normativos_cnj_bgem3.csv"
DSN = "host=localhost port=5433 dbname=normas user=normas password=normas"

print("Connecting to DB...")
try:
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
except Exception as e:
    print(f"Error connecting to DB: {e}")
    sys.exit(1)

start = time.time()
batch = []
BATCH_SIZE = 1000
total = 0

print(f"Reading CSV from {CSV_PATH}...")
with open(CSV_PATH, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f, delimiter=";", quotechar='"')
    for row in reader:
        doc_id = row.get("id", "").strip()
        metadata = row.get("metadata", "{}").strip()

        if not doc_id:
            continue

        try:
            cleaned_meta = metadata.replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t")
            meta_json = json.loads(cleaned_meta)
        except Exception as e:
            meta_json = {}

        if meta_json:
            batch.append((json.dumps(meta_json, ensure_ascii=False), doc_id))
            total += 1

        if len(batch) >= BATCH_SIZE:
            execute_values(
                cur,
                "UPDATE normativos SET metadata = data.metadata::jsonb FROM (VALUES %s) AS data (metadata, id) WHERE normativos.id = data.id",
                batch,
                template="(%s, %s)"
            )
            conn.commit()
            elapsed = time.time() - start
            print(f"  ... Updated {total} rows ({elapsed:.1f}s)", flush=True)
            batch = []

if batch:
    execute_values(
        cur,
        "UPDATE normativos SET metadata = data.metadata::jsonb FROM (VALUES %s) AS data (metadata, id) WHERE normativos.id = data.id",
        batch,
        template="(%s, %s)"
    )
    conn.commit()

elapsed = time.time() - start
print(f">>> Metadata update complete: {total} rows in {elapsed:.1f}s")
cur.close()
conn.close()
