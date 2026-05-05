import os, time, json, logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import mysql.connector
import pika

# Cấu hình log cơ bản
logging.basicConfig(level=logging.INFO)
app = FastAPI(title="NOAH Order API")

# Cấu hình CORS để cho phép Dashboard truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class OrderRequest(BaseModel):
    user_id:    int
    product_id: int
    quantity:   int

    @field_validator('quantity')
    @classmethod
    def quantity_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('Số lượng phải lớn hơn 0')
        return v

def connect_with_retry(connect_fn, name, retries=10, wait=5):
    """Thực hiện kết nối lại nếu gặp lỗi."""
    for i in range(retries):
        try:
            return connect_fn()
        except Exception as e:
            logging.warning(f"Thử lại {i+1}/{retries} kết nối tới {name}: {e}")
            time.sleep(wait)
    raise RuntimeError(f"Không thể kết nối tới {name} sau nhiều lần thử")

def get_mysql():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        database=os.getenv("MYSQL_DB", "noah_store"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "root"),
    )

def get_rabbitmq():
    conn = pika.BlockingConnection(
        pika.ConnectionParameters(host=os.getenv("RABBITMQ_HOST", "rabbitmq"))
    )
    ch = conn.channel()
    ch.queue_declare(queue='order_queue', durable=True)
    return conn, ch

@app.post("/api/orders", status_code=202)
def create_order(order: OrderRequest):
    # Bước 1: Lưu thông tin đơn hàng vào MySQL với trạng thái PENDING
    try:
        db = connect_with_retry(get_mysql, "MySQL")
        cur = db.cursor()
        
        # Kiểm tra sự tồn tại của sản phẩm và lấy giá
        cur.execute("SELECT price FROM products WHERE id = %s", (order.product_id,))
        row = cur.fetchone()
        if not row:
            cur.close(); db.close()
            raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")
        
        price       = row[0]
        total_price = float(price * order.quantity)
        
        cur.execute(
            "INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES (%s,%s,%s,%s,'PENDING')",
            (order.user_id, order.product_id, order.quantity, total_price)
        )
        db.commit()
        order_id = cur.lastrowid
        cur.close(); db.close()
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        logging.error(f"Lỗi MySQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Bước 2: Đẩy đơn hàng vào hàng đợi RabbitMQ để xử lý bất đồng bộ
    try:
        rmq_conn, ch = connect_with_retry(get_rabbitmq, "RabbitMQ")
        payload = {
            "order_id":    order_id,
            "user_id":     order.user_id,
            "product_id":  order.product_id,
            "quantity":    order.quantity,
            "total_price": total_price,
        }
        ch.basic_publish(
            exchange='',
            routing_key='order_queue',
            body=json.dumps(payload),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        rmq_conn.close()
    except Exception as e:
        logging.error(f"Lỗi RabbitMQ: {e}")
        # Đánh dấu đơn hàng thất bại nếu không thể đẩy vào hàng đợi
        db = connect_with_retry(get_mysql, "MySQL")
        cur = db.cursor()
        cur.execute("UPDATE orders SET status='FAILED' WHERE id = %s", (order_id,))
        db.commit()
        cur.close(); db.close()
        raise HTTPException(status_code=500, detail="Không thể gửi đơn hàng vào hàng đợi")

    return {"message": "Đơn hàng đã nhận", "order_id": order_id}

@app.get("/health")
def health():
    return {"status": "ok"}
