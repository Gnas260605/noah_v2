import { useEffect, useState, useMemo } from "react"
import { noahApi } from "../services/api"
import { Package, RefreshCw, Search, AlertTriangle, TrendingDown, CheckCircle, Filter } from "lucide-react"

const formatVND = (v) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v)

const STOCK_THRESHOLDS = {
  LOW: 50,
  CRITICAL: 10
}

export default function InventoryPanel() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [filter, setFilter]     = useState("all") // all, low, out

  const fetchInventory = () => {
    setLoading(true)
    noahApi.getProducts()
      .then(r => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const stats = useMemo(() => {
    return {
      total: products.length,
      low: products.filter(p => p.stock > 0 && p.stock < STOCK_THRESHOLDS.LOW).length,
      out: products.filter(p => p.stock <= 0).length
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .filter(p => {
        if (filter === "low") return p.stock > 0 && p.stock < STOCK_THRESHOLDS.LOW
        if (filter === "out") return p.stock <= 0
        return true
      })
  }, [products, search, filter])

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="animate-spin mx-auto mb-2 text-orange-500" size={32} />
        <p className="text-sm font-medium">Đang đồng bộ dữ liệu kho...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Tổng sản phẩm</p>
            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
          </div>
        </div>
        <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 ${stats.low > 0 ? "border-yellow-200 bg-yellow-50/30" : "border-slate-200"}`}>
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sắp hết hàng</p>
            <p className="text-2xl font-bold text-slate-800">{stats.low}</p>
          </div>
        </div>
        <div className={`bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4 ${stats.out > 0 ? "border-red-200 bg-red-50/30" : "border-slate-200"}`}>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Hết hàng</p>
            <p className="text-2xl font-bold text-slate-800">{stats.out}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {[
            { id: "all", label: "Tất cả", icon: Filter },
            { id: "low", label: "Sắp hết", icon: TrendingDown },
            { id: "out", label: "Hết hàng", icon: AlertTriangle },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${filter === btn.id 
                  ? "bg-slate-800 text-white shadow-md" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              <btn.icon size={14} />
              {btn.label}
            </button>
          ))}
          <button 
            onClick={fetchInventory}
            className="ml-2 p-2 text-slate-400 hover:text-orange-500 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
            Không tìm thấy sản phẩm phù hợp.
          </div>
        ) : filteredProducts.map((p) => {
          const isCritical = p.stock <= STOCK_THRESHOLDS.CRITICAL
          const isLow = p.stock < STOCK_THRESHOLDS.LOW
          const pct = Math.min((p.stock / 200) * 100, 100) // Scale to 200 units for visualization
          
          let statusLabel = "Ổn định"
          let statusColor = "bg-green-500"
          let badgeColor = "text-green-600 bg-green-50"
          let Icon = CheckCircle

          if (p.stock <= 0) {
            statusLabel = "Hết hàng"
            statusColor = "bg-red-500"
            badgeColor = "text-red-600 bg-red-50"
            Icon = AlertTriangle
          } else if (isCritical) {
            statusLabel = "Nguy cấp"
            statusColor = "bg-red-400"
            badgeColor = "text-red-500 bg-red-50"
            Icon = AlertTriangle
          } else if (isLow) {
            statusLabel = "Cảnh báo"
            statusColor = "bg-yellow-500"
            badgeColor = "text-yellow-600 bg-yellow-50"
            Icon = TrendingDown
          }

          return (
            <div key={p.product_id} className="group bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                  <Package size={20} className="text-orange-500" />
                </div>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeColor}`}>
                  <Icon size={10} />
                  {statusLabel}
                </span>
              </div>
              
              <div className="mb-4">
                <h4 className="font-bold text-slate-800 truncate group-hover:text-orange-600 transition-colors">{p.name}</h4>
                <p className="text-slate-400 text-[10px] font-mono">#{p.product_id}</p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{formatVND(p.price)}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-slate-500">Tồn kho hiện tại</span>
                  <span className="text-slate-900">{p.stock} sp</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`${statusColor} h-full rounded-full transition-all duration-500 ease-out`} 
                    style={{ width: `${pct}%` }} 
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
