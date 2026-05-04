import { useEffect, useState } from "react"
import { noahApi } from "../services/api"
import { Package, RefreshCw } from "lucide-react"

const formatVND = (v) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(v)

export default function InventoryPanel() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    noahApi.getProducts()
      .then(r => setProducts(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-24 text-center text-slate-400 animate-pulse"><RefreshCw className="animate-spin mx-auto mb-2" /> Đang tải dữ liệu kho...</div>

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const pct   = Math.min((p.stock / 100) * 100, 100)
          const color = p.stock < 10 ? "bg-red-500" : p.stock < 30 ? "bg-yellow-500" : "bg-green-500"
          const badge = p.stock < 10 ? "text-red-600 bg-red-50" : p.stock < 30 ? "text-yellow-600 bg-yellow-50" : "text-green-600 bg-green-50"

          return (
            <div key={p.product_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Package size={20} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{p.name}</h4>
                  <p className="text-orange-500 font-bold mt-0.5">{formatVND(p.price)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tồn kho</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${badge}`}>
                    {p.stock} sản phẩm
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
