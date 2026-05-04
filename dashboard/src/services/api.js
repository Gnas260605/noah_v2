import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const API_KEY = import.meta.env.VITE_API_KEY || "noah-secret-key";

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
    apikey: API_KEY,
  },
  timeout: 10000,
});

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.detail || error.message || "Unknown error",
      status: error.response?.status,
      originalError: error,
    };
    console.error("API Error:", customError);
    return Promise.reject(customError);
  }
);

export const noahApi = {
  getStats: () => apiClient.get("/report/api/stats"),
  getReport: (page = 1, pageSize = 20) => 
    apiClient.get("/report/api/report", { params: { page, page_size: pageSize } }),
  getProducts: () => apiClient.get("/report/api/products"),
  createOrder: (orderData) => apiClient.post("/orders/api/orders", orderData),
};

export default apiClient;
