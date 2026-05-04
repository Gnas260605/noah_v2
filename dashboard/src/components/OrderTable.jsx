import { useEffect, useState } from "react"
import { noahApi } from "../services/api"
import { ChevronLeft, ChevronRight, Search, AlertCircle, RefreshCw } from "lucide-react"

const STATUS_STYLE = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  SYNCED:    "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  FAILED:    "bg-red-100 text-red-700",
}

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val ?? 0)

export default function OrderTable() {
  const [data, setData]     = useState({ orders: [], pagination: {} })
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const PAGE_SIZE = 20

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await noahApi.getReport(page, PAGE_SIZE)
      setData(res.data)
    } catch (e) {
      console.error(e)
      setError(e.message || "Lỗi tải danh sách đơn hàng.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [page])

  const filtered = search
    ? data.orders.filter((o) => String(o.user_id).includes(search))
    : data.orders

  const totalPages = Math.ceil((data.pagination.total ?? 0) / PAGE_SIZE)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Lọc theo User ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {error}</span>}
          <button 
            onClick={fetchOrders} 
            disabled={loading}
            className="p-2 text-slate-400 hover:text-orange-500 transition-colors disabled:opacity-30"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <span className="text-sm text-slate-500">
            Tổng: <strong>{data.pagination.total ?? 0}</strong> đơn
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {["Order ID","User ID","Product ID","SL","Tổng tiền","Trạng thái","Thời gian"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={7} className="py-24 text-center"><RefreshCw className="animate-spin mx-auto text-slate-300" size={32} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-24 text-center text-slate-400">{error ? "Không thể tải dữ liệu" : "Không có đơn hàng nào"}</td></tr>
            ) : filtered.map((order) => (
              <tr key={order.order_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-700">#{order.order_id}</td>
                <td className="px-4 py-3 text-slate-600">{order.user_id}</td>
                <td className="px-4 py-3 text-slate-600">{order.product_id}</td>
                <td className="px-4 py-3 text-slate-600">{order.quantity}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{formatVND(order.total_price)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLE[order.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {order.created_at ? new Date(order.created_at).toLocaleString("vi-VN") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <span className="text-sm text-slate-500">
          Trang {page} / {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm flex items-center gap-1 disabled:opacity-40 hover:border-orange-300 transition-colors"
          >
            <ChevronLeft size={15} /> Trước
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm flex items-center gap-1 disabled:opacity-40 hover:border-orange-300 transition-colors"
          >
            Tiếp <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}
