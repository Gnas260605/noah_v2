import os, time, shutil, csv, logging
import mysql.connector
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

INPUT_DIR     = os.getenv("INPUT_DIR", "/app/input")
PROCESSED_DIR = os.getenv("PROCESSED_DIR", "/app/processed")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))

def get_db_connection():
    """Retry pattern for MySQL connection."""
    retries = 10
    wait = 5
    for attempt in range(retries):
        try:
            conn = mysql.connector.connect(
                host=os.getenv("MYSQL_HOST", "mysql"),
                database=os.getenv("MYSQL_DB", "noah_store"),
                user=os.getenv("MYSQL_USER", "root"),
                password=os.getenv("MYSQL_PASSWORD", "root"),
            )
            logging.info("Connected to MySQL.")
            return conn
        except Exception as e:
            logging.warning(f"MySQL not ready ({e}), retry {attempt+1}/{retries}...")
            time.sleep(wait)
    raise RuntimeError("Cannot connect to MySQL after retries.")

def process_file(filepath: str, cursor, conn):
    processed = 0
    skipped   = 0

    try:
        with open(filepath, newline='', encoding='utf-8-sig') as f: # Use utf-8-sig for BOM
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # Clean keys and values
                    row = {k.strip(): v.strip() if v else "" for k, v in row.items()}
                    
                    raw_pid = row.get("product_id") or row.get("id")
                    raw_qty = row.get("quantity")   or row.get("stock")
                    
                    if not raw_pid or not raw_qty:
                        skipped += 1
                        continue
                        
                    p_id = int(float(raw_pid))
                    qty  = int(float(raw_qty))
                    
                    if qty < 0:
                        logging.warning(f"Skipped negative stock: p_id={p_id}, qty={qty}")
                        skipped += 1
                        continue
                    
                    cursor.execute(
                        "UPDATE products SET stock = %s WHERE id = %s",
                        (qty, p_id)
                    )
                    processed += 1
                except Exception as e:
                    logging.warning(f"Skipped invalid row {row}: {e}")
                    skipped += 1

        conn.commit()
        logging.info(f"File {os.path.basename(filepath)}: Processed {processed}, Skipped {skipped}")
    except Exception as e:
        logging.error(f"Error reading file {filepath}: {e}")
        raise e

def move_to_processed(filepath: str):
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = os.path.basename(filepath)
    dest      = os.path.join(PROCESSED_DIR, f"{timestamp}_{filename}")
    shutil.move(filepath, dest)
    logging.info(f"Moved to {dest}")

def main():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    conn   = get_db_connection()
    
    logging.info(f"Polling {INPUT_DIR} every {POLL_INTERVAL}s...")
    while True:
        try:
            if not conn.is_connected():
                conn = get_db_connection()
            
            cursor = conn.cursor()
            for fname in os.listdir(INPUT_DIR):
                if fname.endswith(".csv"):
                    fpath = os.path.join(INPUT_DIR, fname)
                    logging.info(f"Processing: {fname}")
                    process_file(fpath, cursor, conn)
                    move_to_processed(fpath)
            
            cursor.close()
        except Exception as e:
            logging.error(f"Loop error: {e}")
            time.sleep(5)
            try: conn = get_db_connection()
            except: pass

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
