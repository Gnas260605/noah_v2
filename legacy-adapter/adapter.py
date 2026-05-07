import os, time, shutil, csv, logging
import mysql.connector
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

INPUT_DIR     = os.getenv("INPUT_DIR", "/app/input")
PROCESSED_DIR = os.getenv("PROCESSED_DIR", "/app/processed")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "5"))

def get_db_connection():
    """Thiết lập kết nối tới MySQL với cơ chế thử lại."""
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
            logging.info("Đã kết nối thành công tới MySQL.")
            return conn
        except Exception as e:
            logging.warning(f"MySQL chưa sẵn sàng ({e}), đang thử lại {attempt+1}/{retries}...")
            time.sleep(wait)
    raise RuntimeError("Không thể kết nối tới MySQL sau nhiều lần thử.")

def process_file(filepath: str, cursor, conn):
    """Đọc file CSV và cập nhật tồn kho vào cơ sở dữ liệu."""
    processed = 0
    skipped   = 0

    try:
        # Sử dụng utf-8-sig để xử lý BOM nếu có
        with open(filepath, newline='', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # Làm sạch dữ liệu đầu vào
                    row = {k.strip(): v.strip() if v else "" for k, v in row.items()}
                    
                    raw_pid = row.get("product_id") or row.get("id")
                    raw_qty = row.get("quantity")   or row.get("stock")
                    
                    if not raw_pid or not raw_qty:
                        skipped += 1
                        continue
                        
                    p_id = int(float(raw_pid))
                    qty  = int(float(raw_qty))
                    
                    # Bỏ qua nếu số lượng âm (dữ liệu lỗi)
                    if qty < 0:
                        logging.warning(f"Bỏ qua dòng có tồn kho âm: p_id={p_id}, qty={qty}")
                        skipped += 1
                        continue
                    
                    cursor.execute(
                        "UPDATE products SET stock = %s WHERE id = %s",
                        (qty, p_id)
                    )
                    processed += 1
                except Exception as e:
                    logging.warning(f"Bỏ qua dòng không hợp lệ {row}: {e}")
                    skipped += 1

        conn.commit()
        # Hiển thị log tóm tắt theo yêu cầu của thầy
        summary = f"Processed {processed} records. Skipped {skipped} invalid records."
        logging.info(f"File {os.path.basename(filepath)}: {summary}")
    except Exception as e:
        logging.error(f"Lỗi khi đọc file {filepath}: {e}")
        raise e

def move_to_processed(filepath: str):
    """Di chuyển file đã xử lý vào thư mục lưu trữ kèm timestamp."""
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = os.path.basename(filepath)
    dest      = os.path.join(PROCESSED_DIR, f"{timestamp}_{filename}")
    shutil.move(filepath, dest)
    logging.info(f"Đã di chuyển file tới: {dest}")

def main():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    conn = get_db_connection()
    
    logging.info(f"Đang quét thư mục {INPUT_DIR} mỗi {POLL_INTERVAL} giây...")
    while True:
        cursor = None
        try:
            if not conn.is_connected():
                conn = get_db_connection()
            
            cursor = conn.cursor()
            for fname in os.listdir(INPUT_DIR):
                if fname.endswith(".csv"):
                    fpath = os.path.join(INPUT_DIR, fname)
                    if fname == "inventory.csv":
                        logging.info(f"--- Đang xử lý file yêu cầu: {fname} ---")
                    else:
                        logging.info(f"Đang xử lý file: {fname}")
                    
                    try:
                        process_file(fpath, cursor, conn)
                        move_to_processed(fpath)
                    except Exception as e:
                        logging.error(f"Không thể xử lý file {fname}: {e}")
            
        except Exception as e:
            logging.error(f"Lỗi trong vòng lặp quét file: {e}")
            time.sleep(5)
            try: 
                conn = get_db_connection()
            except: 
                pass
        finally:
            if cursor: 
                try: cursor.close()
                except: pass

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
