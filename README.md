# 🏗️ NOAH Unified Commerce System

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Kong](https://img.shields.io/badge/Kong-003459?style=for-the-badge&logo=kong&logoColor=white)](https://konghq.com/)

**NOAH** là một hệ thống microservices hiện đại, được thiết kế để giải quyết bài toán tích hợp dữ liệu bán lẻ từ các hệ thống cũ (Legacy) sang kiến trúc hiện đại. Hệ thống sử dụng mô hình hướng sự kiện (Event-Driven Architecture) với RabbitMQ và quản lý API tập trung qua Kong Gateway.

---

## 🚀 Luồng Hoạt Động (System Architecture)

1.  **Ingestion:** Dữ liệu từ file CSV cũ hoặc đơn hàng mới được đẩy vào hệ thống qua `legacy-adapter` hoặc `order-api`.
2.  **Messaging:** RabbitMQ tiếp nhận đơn hàng, đảm bảo tính bền vững (Persistence) và xử lý bất đồng bộ.
3.  **Processing:** `order-worker` tiêu thụ message, thực hiện logic nghiệp vụ và đồng bộ hóa dữ liệu song song vào **MySQL** (Bán hàng) và **PostgreSQL** (Tài chính).
4.  **Security:** Toàn bộ API được bảo vệ bởi **Kong API Gateway** với cơ chế Key Authentication và Rate Limiting.
5.  **Monitoring:** Dashboard React cung cấp cái nhìn tổng quan về doanh thu, tồn kho và trạng thái hệ thống theo thời gian thực.

---

## 📂 Cấu Trúc Dự Án

```text
noah-system/
├── dashboard/          # Giao diện quản trị (React + Vite)
├── order-api/          # API tiếp nhận đơn hàng (Flask)
├── order-worker/       # Worker xử lý hàng đợi RabbitMQ (Python)
├── report-service/     # Dịch vụ tổng hợp báo cáo & đối soát (Python)
├── legacy-adapter/     # Chuyển đổi dữ liệu từ hệ thống cũ (CSV/Legacy DB)
├── kong/               # Cấu hình API Gateway (Declarative Config)
├── db/                 # Scripts khởi tạo cơ sở dữ liệu (SQL)
└── docker-compose.yml  # Orchestration cho toàn bộ hệ thống
```

---

## 🛠️ Hướng Dẫn Cài Đặt (Quick Start)

Để đảm bảo hệ thống chạy ổn định và không gặp lỗi, vui lòng thực hiện theo các bước sau:

### 1. Yêu cầu hệ thống
-   **Docker** & **Docker Compose** đã được cài đặt.
-   Cổng `3000`, `8000`, `8001`, `15672`, `3307`, `5432` đang trống.

### 2. Thiết lập môi trường
Sao chép file cấu hình mẫu và điều chỉnh nếu cần:
```bash
cp .env.example .env
```
*(Trên Windows PowerShell: `cp .env.example .env` hoặc `copy .env.example .env`)*

### 3. Khởi chạy hệ thống
Sử dụng Docker Compose để build và chạy tất cả các services:
```bash
docker-compose up --build -d
```

### 4. Kiểm tra trạng thái
Đợi khoảng 30-60 giây để các database khởi tạo xong. Bạn có thể kiểm tra log bằng lệnh:
```bash
docker-compose logs -f
```

---

## 🔗 Danh Sách Truy Cập (Endpoints)

| Service | URL | Mô tả |
| :--- | :--- | :--- |
| **Dashboard** | [http://localhost:3000](http://localhost:3000) | Giao diện chính |
| **API Gateway** | [http://localhost:8000](http://localhost:8000) | Điểm truy cập API tập trung |
| **Kong Admin** | [http://localhost:8001](http://localhost:8001) | Quản lý Gateway |
| **RabbitMQ UI** | [http://localhost:15672](http://localhost:15672) | Quản lý hàng đợi (guest/guest) |
| **MySQL** | `localhost:3307` | Database bán hàng |
| **PostgreSQL** | `localhost:5432` | Database tài chính |

---

## 🛡️ Tính Năng Nổi Bật

-   ✅ **Microservices Architecture:** Các thành phần hoạt động độc lập, dễ dàng mở rộng.
-   ✅ **Real-time Inventory:** Cập nhật kho hàng tức thời qua WebSockets/Polling.
-   ✅ **Data Consistency:** Đảm bảo dữ liệu nhất quán giữa hai loại DB khác nhau.
-   ✅ **Security First:** Chống spam API bằng Rate Limiting và bảo mật bằng API Key.
-   ✅ **Legacy Support:** Tự động hóa việc nhập liệu từ các định dạng cũ.

---

## ❓ Xử Lý Sự Cố (Troubleshooting)

-   **Lỗi DB Connection:** Nếu các service báo lỗi không kết nối được DB, hãy thử restart lại system: `docker-compose restart`. Thường do DB khởi động chậm hơn code.
-   **Lỗi Cổng bị chiếm:** Kiểm tra xem có app nào đang chạy ở cổng 3000 hoặc 8000 không và tắt chúng đi.
-   **Dữ liệu không hiển thị:** Đảm bảo bạn đã chạy script `ingest_orders.py` (nếu cần) hoặc kiểm tra thư mục `legacy-adapter/input` đã có file CSV chưa.

---
**Team 1 - CMUCS 445**  
*Chúc bạn có trải nghiệm tốt với hệ thống NOAH!*
