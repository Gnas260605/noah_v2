import os, json, time, mysql.connector, pika

def get_mysql():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3307")),
        database=os.getenv("MYSQL_DB", "noah_store"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "root")
    )

def get_rabbitmq():
    conn = pika.BlockingConnection(
        pika.ConnectionParameters(host=os.getenv("RABBITMQ_HOST", "rabbitmq"))
    )
    ch = conn.channel()
    ch.queue_declare(queue='order_queue', durable=True)
    return conn, ch

def main():
    print("Đang quét đơn hàng PENDING để đẩy vào RabbitMQ...")
    db = get_mysql()
    cur = db.cursor(dictionary=True)
    cur.execute("SELECT id as order_id, user_id, product_id, quantity, total_price FROM orders WHERE status='PENDING'")
    orders = cur.fetchall()
    
    if not orders:
        print("Không có đơn hàng PENDING nào.")
        return

    rmq_conn, ch = get_rabbitmq()
    count = 0
    for order in orders:
        payload = {
            "order_id":    order['order_id'],
            "user_id":     order['user_id'],
            "product_id":  order['product_id'],
            "quantity":    order['quantity'],
            "total_price": float(order['total_price']),
        }
        ch.basic_publish(
            exchange='',
            routing_key='order_queue',
            body=json.dumps(payload),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        count += 1
        if count % 1000 == 0:
            print(f"Đã đẩy {count}/{len(orders)} đơn hàng...")

    rmq_conn.close()
    db.close()
    print(f"Xong! Đã đẩy {count} đơn hàng vào hàng đợi.")

if __name__ == "__main__":
    main()
