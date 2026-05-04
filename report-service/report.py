import os, time, logging
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
import psycopg2
import pandas as pd

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="NOAH Report Service")

# BẮT BUỘC: CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def connect_with_retry(connect_fn, name, retries=10, wait=5):
    for i in range(retries):
        try:
            return connect_fn()
        except Exception as e:
            logging.warning(f"Retry {i+1}/{retries} connecting to {name}: {e}")
            time.sleep(wait)
    raise RuntimeError(f"Cannot connect to {name} after retries")

def get_mysql():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        database=os.getenv("MYSQL_DB", "noah_store"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "root")
    )

def get_postgres():
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "postgres"),
        dbname=os.getenv("POSTGRES_DB", "noah_finance"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "postgres")
    )

def get_mysql_df(query: str, params=None):
    conn = connect_with_retry(get_mysql, "MySQL")
    df = pd.read_sql(query, conn, params=params)
    conn.close()
    return df

def get_pg_df(query: str, params=None):
    conn = connect_with_retry(get_postgres, "PostgreSQL")
    df = pd.read_sql(query, conn, params=params)
    conn.close()
    return df

@app.get("/api/report")
def get_report(page: int = Query(1, ge=1), page_size: int = Query(20, le=100)):
    offset = (page - 1) * page_size

    # 1. Lấy orders từ MySQL (có phân trang)
    orders_df = get_mysql_df(
        "SELECT id as order_id, user_id, product_id, quantity, total_price, status, created_at "
        "FROM orders ORDER BY created_at DESC LIMIT %s OFFSET %s",
        params=(page_size, offset)
    )

    # 2. Tổng số đơn (để tính pagination)
    count_df = get_mysql_df("SELECT COUNT(*) as total FROM orders")
    total = int(count_df['total'][0])

    # 3. Lấy transactions từ PostgreSQL để stitching
    txn_df = get_pg_df("SELECT order_id, amount FROM transactions")

    # 4. Data Stitching
    merged = pd.merge(orders_df, txn_df, on='order_id', how='left', suffixes=('', '_pg'))
    
    # Fill NaN for missing transactions
    merged['amount'] = merged['amount'].fillna(0)

    # 5. Doanh thu theo user (Top 10)
    # Lấy toàn bộ order SYNCED để tính revenue chính xác (hoặc dùng cached stats)
    # Ở đây ta lấy từ MySQL data hiện tại cho đơn giản
    all_synced = get_mysql_df("SELECT user_id, total_price FROM orders WHERE status='SYNCED'")
    revenue_by_user = []
    if not all_synced.empty:
        revenue_by_user = (
            all_synced.groupby('user_id')['total_price']
            .sum()
            .reset_index()
            .rename(columns={'total_price': 'total_revenue'})
            .sort_values('total_revenue', ascending=False)
            .head(10)
            .to_dict(orient='records')
        )

    return {
        "pagination": {"page": page, "page_size": page_size, "total": total},
        "orders": merged.to_dict(orient='records'),
        "revenue_by_user": revenue_by_user,
    }

@app.get("/api/stats")
def get_stats():
    # Thống kê tổng hợp
    total_orders = get_mysql_df("SELECT COUNT(*) as c FROM orders")['c'][0]
    pending      = get_mysql_df("SELECT COUNT(*) as c FROM orders WHERE status='PENDING'")['c'][0]
    synced       = get_mysql_df("SELECT COUNT(*) as c FROM orders WHERE status='SYNCED'")['c'][0]
    
    # Tính doanh thu từ toàn bộ đơn hàng (bao gồm cả PENDING để thấy dữ liệu ngay)
    revenue_res = get_mysql_df("SELECT COALESCE(SUM(total_price),0) as r FROM orders WHERE status != 'FAILED'")
    total_revenue = float(revenue_res['r'][0])
    
    inventory_df = get_mysql_df("SELECT id as product_id, name, stock FROM products")

    return {
        "total_orders":   int(total_orders),
        "pending_orders": int(pending),
        "synced_orders":  int(synced),
        "total_revenue":  total_revenue,
        "inventory":      inventory_df.to_dict(orient='records'),
    }

@app.get("/api/products")
def get_products():
    df = get_mysql_df("SELECT id as product_id, name, price, stock FROM products")
    return df.to_dict(orient='records')

@app.get("/health")
def health():
    return {"status": "ok"}
