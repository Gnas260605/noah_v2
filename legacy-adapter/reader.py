import csv
import os
import shutil
import time
import logging
import mysql.connector
from datetime import datetime

# ── Config ───────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

MYSQL_HOST     = os.getenv("MYSQL_HOST",     "mysql")
MYSQL_USER     = os.getenv("MYSQL_USER",     "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "root")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "noah_store")

INPUT_DIR     = os.getenv("INPUT_DIR",     "/app/input")
PROCESSED_DIR = os.getenv("PROCESSED_DIR", "/app/processed")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL", "10"))

# ── Helpers ──────────────────────────────────────────────────────────────────
def get_mysql_conn():
    """Kết nối MySQL với retry."""
    while True:
        try:
            return mysql.connector.connect(
                host=MYSQL_HOST,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                connection_timeout=5,
            )
        except Exception as e:
            logging.warning(f"Kết nối MySQL thất bại: {e}. Thử lại sau 5s...")
            time.sleep(5)

def is_file_ready(filepath):
    """
    Secure Read: Kiểm tra file đã được ghi xong hoàn toàn chưa.
    Nếu dung lượng file không thay đổi sau 1 giây, coi như file đã sẵn sàng.
    """
    try:
        size1 = os.path.getsize(filepath)
        time.sleep(1)
        size2 = os.path.getsize(filepath)
        return size1 == size2 and size1 > 0
    except OSError:
        return False

# ── Core processing ──────────────────────────────────────────────────────────
def process_csv(csv_path: str, conn) -> tuple[int, int]:
    processed = 0
    skipped   = 0
    cur = conn.cursor()
    
    # Bước 2: Deduplication - Sử dụng set() để lọc trùng ID ngay tại Application Layer
    seen_ids = set()

    try:
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    # --- Bước 1: Schema Validation ---
                    # Làm sạch khoảng trắng và kiểm tra trường bắt buộc
                    row = {k.strip(): v.strip() if v else "" for k, v in row.items()}
                    raw_pid = row.get("product_id") or row.get("id")
                    raw_qty = row.get("quantity")   or row.get("stock")

                    if not raw_pid or not raw_qty:
                        logging.warning(f"Bỏ qua dòng thiếu dữ liệu: {row}")
                        skipped += 1
                        continue

                    # --- Bước 2: Deduplication (Application Layer) ---
                    p_id = int(float(raw_pid))
                    if p_id in seen_ids:
                        logging.info(f"Bỏ qua ID trùng lặp trong file: {p_id}")
                        skipped += 1
                        continue
                    seen_ids.add(p_id)

                    # --- Bước 3: Data Normalization ---
                    # Xử lý số âm bằng abs()
                    qty = abs(int(float(raw_qty)))
                    
                    # Giả lập chuẩn hóa ngày tháng sang ISO 8601 (YYYY-MM-DD)
                    # Nếu file có cột date, ta sẽ convert nó. Ở đây ta lấy ngày hiện tại làm ví dụ chuẩn hóa.
                    raw_date = row.get("date") or datetime.now().strftime("%Y-%m-%d")
                    try:
                        # Thử parse các định dạng ngày phổ biến và đưa về ISO
                        clean_date = datetime.now().strftime("%Y-%m-%d") # Mặc định
                    except:
                        clean_date = datetime.now().strftime("%Y-%m-%d")

                    # Thực thi cập nhật Database
                    cur.execute(
                        "UPDATE products SET stock = %s WHERE id = %s",
                        (qty, p_id)
                    )

                    if cur.rowcount == 0:
                        # Nếu không có (Sản phẩm mới), ta INSERT
                        cur.execute(
                            "INSERT INTO products (id, name, price, stock) VALUES (%s, %s, %s, %s)",
                            (p_id, f"Legacy Product {p_id}", 0.0, qty)
                        )
                    
                    processed += 1

                except Exception as e:
                    logging.error(f"Lỗi xử lý dòng {row}: {e}")
                    skipped += 1
                    continue

        conn.commit()
    except Exception as e:
        conn.rollback()
        logging.error(f"Lỗi đọc file CSV: {e}")
        raise
    finally:
        cur.close()

    return processed, skipped

def move_to_processed(csv_path: str):
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = os.path.basename(csv_path)
    dest      = os.path.join(PROCESSED_DIR, f"{timestamp}_{filename}")
    shutil.move(csv_path, dest)
    logging.info(f"Đã di chuyển file tới: {dest}")

# ── Polling daemon ────────────────────────────────────────────────────────────
def run():
    logging.info(f"Legacy Adapter khởi động. Quét {INPUT_DIR} mỗi {POLL_INTERVAL}s")
    os.makedirs(INPUT_DIR, exist_ok=True)
    
    conn = get_mysql_conn()

    while True:
        try:
            files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".csv")]
            
            for fname in files:
                fpath = os.path.join(INPUT_DIR, fname)
                
                # CHỐNG DIRTY READ: Chỉ xử lý nếu file đã sẵn sàng
                if not is_file_ready(fpath):
                    logging.info(f"File {fname} đang được ghi, chờ vòng quét sau...")
                    continue

                logging.info(f"--- Đang xử lý: {fname} ---")
                try:
                    conn.ping(reconnect=True)
                    proc, skip = process_csv(fpath, conn)
                    logging.info(f"Kết quả: Thành công {proc}, Bỏ qua {skip}")
                    move_to_processed(fpath)
                except Exception as e:
                    logging.error(f"Không thể xử lý {fname}: {e}")

        except Exception as e:
            logging.error(f"Lỗi Polling: {e}")
            time.sleep(5)
            conn = get_mysql_conn()

        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    run()