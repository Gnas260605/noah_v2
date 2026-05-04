# NOAH RETAIL — UNIFIED COMMERCE SYSTEM
## Tài liệu kỹ thuật dự án (Technical Specification)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Kiến trúc tổng thể
Hệ thống tích hợp dữ liệu từ kho Legacy (CSV) vào MySQL, xử lý đơn hàng qua RabbitMQ và đồng bộ sang PostgreSQL (Finance), hiển thị báo cáo qua Dashboard Real-time.

```
[CSV File] ──► [Legacy Adapter] ──► [MySQL - Web Store]
                                           │
[Client] ──► [Kong Gateway :8000] ──► [Order API :5001]
                                           │
                                  [RabbitMQ Queue]
                                           │
                             [Order Worker (Email Notification)]
                                  │               │
                            [PostgreSQL]      [MySQL update]
                                  │
                   [Report Service :5002] ──► [Dashboard UI :3000]
```

### 1.2 Stack công nghệ & Cổng kết nối

| Thành phần | Công nghệ | Port (Host) |
|---|---|---|
| Web Store DB | MySQL 8.0 | **3307** |
| Finance DB | PostgreSQL 15 | 5432 |
| Message Broker | RabbitMQ 3 | 5672 / 15672 |
| API Gateway | Kong | **8000** |
| Order API | Python FastAPI | 5001 |
| Report Service | Python FastAPI | 5002 |
| Dashboard UI | React (Vite) | 3000 |

---

## 2. HƯỚNG DẪN TRIỂN KHAI (DOCKER)

### 2.1 Cấu trúc file `.env`
Tạo file `.env` tại thư mục gốc (không đẩy file này lên Git):
```env
VITE_API_BASE=http://localhost:8000
VITE_API_KEY=noah-secret-key
MYSQL_PASSWORD=root
POSTGRES_PASSWORD=postgres
# Option 1: Email Config
SMTP_PASSWORD=your_app_password
```

### 2.2 Khởi chạy hệ thống
```bash
docker-compose up -d --build
```

---

## 3. CHỨC NĂNG NÂNG CAO: OPTION 1 — NOTIFICATION SYSTEM

### 3.1 Mục tiêu
Tăng trải nghiệm khách hàng bằng cách thông báo trạng thái đơn hàng tức thời qua Email và Popup màn hình.

### 3.2 Cơ chế hoạt động
1.  **Trigger**: Sau khi `Order Worker` lưu giao dịch vào PostgreSQL và cập nhật trạng thái `SYNCED` trong MySQL.
2.  **Xử lý**: 
    *   **Email**: Gửi qua SMTP Gmail (App Password) một cách bất đồng bộ.
    *   **UI Popup**: Dashboard polling dữ liệu và hiển thị Toast notification ngay khi nhận diện có đơn hàng mới được đồng bộ.
3.  **Log tiêu chuẩn**: 
    `[INFO] Order #123 synced. Notification sent to user (Email).`

---

## 4. CHI TIẾT CÁC MODULE CHÍNH

### 4.1 Legacy Adapter (Module 1)
Tự động quét thư mục `input/` để cập nhật tồn kho từ CSV vào MySQL. Có khả năng lọc "dữ liệu bẩn" (bỏ qua dòng trống hoặc số lượng âm).

### 4.2 Order Worker (Module 2B)
Consumer xử lý hàng đợi RabbitMQ, thực hiện "Stitching" dữ liệu giữa hai database và kích hoạt hệ thống thông báo.

### 4.3 Kong Gateway (Module 4)
Quản lý tập trung các API, tích hợp `key-auth` và `rate-limiting` để bảo vệ hệ thống khỏi spam request.

---
*Tài liệu được cập nhật lần cuối vào: 04/05/2026*