import { useEffect, useState, useRef } from "react"
import { noahApi } from "../services/api"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { ShoppingBag, Clock, CheckCircle, DollarSign, RefreshCw, AlertCircle } from "lucide-react"

function StatsCard({ title, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-slate-500 text-sm">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const formatVND = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val)

export default function Overview() {
  const [stats, setStats]     = useState(null)
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [toasts, setToasts]   = useState([])
  const intervalRef = useRef(null)
  const lastSyncedCount = useRef(0)

  const addToast = (msg) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const fetchData = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        noahApi.getStats(),
        noahApi.getReport(1, 1),
      ])
      
      const newStats = sRes.data
      
      // Detect new synced orders
      if (lastSyncedCount.current > 0 && newStats.synced_orders > lastSyncedCount.current) {
        const diff = newStats.synced_orders - lastSyncedCount.current
        addToast(`🎉 Đã đồng bộ thành công ${diff} đơn hàng mới!`)
      }
      lastSyncedCount.current = newStats.synced_orders

      setStats(newStats)
      setReport(rRes.data)
      setError(null)
    } catch (e) {
      console.error("Fetch data error:", e)
      setError(e.message || "Không thể kết nối đến máy chủ.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 5000) // Poll faster (5s) for real-time feel
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (loading && !stats) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <RefreshCw className="animate-spin mr-2" size={20} /> Đang tải dữ liệu...
    </div>
  )

  return (
    <div className="space-y-6 relative">
      {/* Toast Overlay */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-right-8 duration-300 flex items-center gap-3">
            <CheckCircle className="text-green-500" size={20} />
            <span className="text-sm font-semibold">{t.msg}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}. Sẽ tự động thử lại sau 30 giây.</p>
          <button 
            onClick={fetchData}
            className="ml-auto bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-xs transition-colors"
          >
            Thử lại ngay
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Tổng đơn hàng"   value={stats?.total_orders ?? 0}   icon={ShoppingBag}  color="bg-blue-500"   />
        <StatsCard title="Đang chờ (Queue)" value={stats?.pending_orders ?? 0} icon={Clock}        color="bg-yellow-500" />
        <StatsCard title="Đã đồng bộ"       value={stats?.synced_orders ?? 0}  icon={CheckCircle}  color="bg-green-500"  />
        <StatsCard
          title="Doanh thu"
          value={formatVND(stats?.total_revenue ?? 0)}
          icon={DollarSign}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Top 10 Khách hàng theo Doanh thu</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.revenue_by_user ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="user_id" tick={{ fontSize: 12 }} label={{ value: "User ID", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(v) => `${(v/1e6).toFixed(0)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatVND(v)} labelFormatter={(l) => `User #${l}`} />
                <Bar dataKey="total_revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-700 mb-4">Tồn kho hiện tại</h3>
          <div className="space-y-4">
            {stats?.inventory?.slice(0, 10).map((p) => (
              <div key={p.product_id} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium truncate w-32">{p.name}</span>
                  <span className={`font-semibold ${p.stock < 10 ? "text-red-500" : "text-slate-700"}`}>
                    {p.stock}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${p.stock < 10 ? "bg-red-500" : p.stock < 30 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${Math.min(p.stock, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {stats?.inventory?.length > 10 && (
              <p className="text-[10px] text-center text-slate-400 italic pt-2">Và {stats.inventory.length - 10} sản phẩm khác...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
