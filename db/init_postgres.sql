-- Initialize Finance Transactions for Postgres (Noah System)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(64) UNIQUE NOT NULL, -- Pipeline Idempotency Key
    user_id INT, 
    product_id INT, 
    quantity INT, 
    total_price DECIMAL(10,2), 
    status VARCHAR(50) DEFAULT 'SYNCED', 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
