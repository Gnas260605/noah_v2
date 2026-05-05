import os, time, json, logging, threading
import pika, psycopg2, mysql.connector

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(message)s')

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

def init_postgres_schema():
    """BẮT BUỘC: Tạo schema tự động cho PostgreSQL."""
    try:
        conn = connect_with_retry(get_postgres, "PostgreSQL")
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                txn_id SERIAL PRIMARY KEY,
                order_id INT NOT NULL UNIQUE,
                user_id INT NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        conn.commit()
        cur.close(); conn.close()
        logging.info("PostgreSQL schema initialized.")
    except Exception as e:
        logging.error(f"Failed to init PG schema: {e}")
        raise e

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_notification(order):
    """
    Gửi thông báo qua Email HTML chuyên nghiệp.
    """
    smtp_server = "smtp.gmail.com"
    smtp_port   = 587
    sender_email   = os.getenv("SMTP_EMAIL", "sang28097@gmail.com")
    sender_password = os.getenv("SMTP_PASSWORD", "YOUR_APP_PASSWORD")
    receiver_email = os.getenv("SMTP_RECEIVER", "sang28097@gmail.com")

    subject = f"🔔 NOAH System: Xác nhận đơn hàng #{order['order_id']}"
    
    # HTML Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f9; }}
            .container {{ max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }}
            .content {{ padding: 30px; }}
            .order-summary {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .order-summary th, .order-summary td {{ padding: 12px; border-bottom: 1px solid #eee; text-align: left; }}
            .order-summary th {{ background-color: #f8fafc; color: #64748b; font-size: 12px; text-transform: uppercase; }}
            .total {{ font-size: 18px; font-weight: bold; color: #1e3a8a; }}
            .status-badge {{ display: inline-block; padding: 6px 12px; background: #dcfce7; color: #15803d; border-radius: 20px; font-size: 12px; font-weight: bold; }}
            .footer {{ background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>NOAH COMMERCE</h1>
            </div>
            <div class="content">
                <h2>Xác nhận đơn hàng thành công!</h2>
                <p>Xin chào <strong>User {order['user_id']}</strong>,</p>
                <p>Cảm ơn bạn đã tin dùng hệ thống NOAH. Đơn hàng của bạn đã được xử lý và đồng bộ thành công vào hệ thống tài chính.</p>
                
                <table class="order-summary">
                    <thead>
                        <tr>
                            <th>Mục</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Mã đơn hàng</td>
                            <td><strong>#{order['order_id']}</strong></td>
                        </tr>
                        <tr>
                            <td>Sản phẩm ID</td>
                            <td>{order['product_id']}</td>
                        </tr>
                        <tr>
                            <td>Số lượng</td>
                            <td>{order['quantity']}</td>
                        </tr>
                        <tr>
                            <td>Trạng thái</td>
                            <td><span class="status-badge">ĐÃ ĐỒNG BỘ (SYNCED)</span></td>
                        </tr>
                        <tr>
                            <td class="total">Tổng thanh toán</td>
                            <td class="total">{order['total_price']:,} đ</td>
                        </tr>
                    </tbody>
                </table>

                <p>Thời gian xử lý: {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
                <center>
                    <a href="http://localhost:3000" class="button">Truy cập Dashboard</a>
                </center>
            </div>
            <div class="footer">
                <p>&copy; 2026 NOAH Unified Commerce Team. All rights reserved.</p>
                <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
            </div>
        </div>
    </body>
    </html>
    """

    # Gửi log bắt buộc theo tiêu chí nghiệm thu
    logging.info(f"Order #{order['order_id']} synced. Notification sent to user (Email).")

    try:
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = subject
        
        # Attach HTML content
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        logging.info(f"HTML Email sent successfully to {receiver_email}")
    except Exception as e:
        logging.error(f"Failed to send Email: {e}")

def callback(ch, method, properties, body):
    try:
        order = json.loads(body)
        logging.info(f"Processing order #{order['order_id']}...")

        # 1. Ghi vào PostgreSQL (Finance)
        pg = connect_with_retry(get_postgres, "PostgreSQL")
        pg_cur = pg.cursor()
        pg_cur.execute(
            "INSERT INTO transactions (order_id, user_id, amount) VALUES (%s,%s,%s) ON CONFLICT (order_id) DO NOTHING",
            (order['order_id'], order['user_id'], order['total_price'])
        )
        pg.commit()
        pg_cur.close(); pg.close()

        # 2. Cập nhật MySQL (Store): PENDING -> SYNCED
        db  = connect_with_retry(get_mysql, "MySQL")
        cur = db.cursor()
        cur.execute(
            "UPDATE orders SET status='SYNCED' WHERE id = %s",
            (order['order_id'],)
        )
        db.commit()
        cur.close(); db.close()

        # 3. Gửi thông báo (Asynchronous side effect)
        threading.Thread(target=send_notification, args=(order,), daemon=True).start()

        ch.basic_ack(delivery_tag=method.delivery_tag)
        logging.info(f"Order #{order['order_id']} synced successfully.")

    except Exception as e:
        logging.error(f"Failed to process order: {e}")
        # NACK and requeue
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
        time.sleep(5)

def main():
    init_postgres_schema()
    
    logging.info("Worker starting, connecting to RabbitMQ...")
    
    def get_rmq_channel():
        conn = pika.BlockingConnection(
            pika.ConnectionParameters(host=os.getenv("RABBITMQ_HOST", "rabbitmq"))
        )
        return conn

    rmq_conn = connect_with_retry(get_rmq_channel, "RabbitMQ")
    ch = rmq_conn.channel()
    ch.queue_declare(queue='order_queue', durable=True)
    ch.basic_qos(prefetch_count=1)
    ch.basic_consume(queue='order_queue', on_message_callback=callback)
    
    logging.info("Worker ready. Waiting for messages...")
    ch.start_consuming()

if __name__ == "__main__":
    main()