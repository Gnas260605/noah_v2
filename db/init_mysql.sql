-- Initialize Products and Orders for MySQL (Noah System)
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY, 
    name VARCHAR(255), 
    price DECIMAL(10,2), 
    stock INT DEFAULT 0
);


CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id VARCHAR(64) UNIQUE NOT NULL, -- Pipeline Idempotency Key
    user_id INT, 
    product_id INT, 
    quantity INT, 
    total_price DECIMAL(10,2), 
    status VARCHAR(50) DEFAULT 'PENDING', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (product_id),
    INDEX (user_id)
);
