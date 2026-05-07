import { useEffect, useState } from "react"
import { noahApi } from "../services/api"
import { ShoppingCart, CheckCircle, XCircle, RefreshCw } from "lucide-react"

const formatVND = (v) => new Intl.NumberFormat("vi-VN",{style:"currency",currency:"VND"}).format(v)

export default function PlaceOrder() {
  const [products, setProducts] = useState([])
  const [form, setForm]         = useState({ user_id: 1, product_id: "", quantity: 1 })
  const [loading, setLoading]   = useState(false)
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    noahApi.getProducts()
      .then(r => { 
        setProducts(r.data); 
        if (r.data.length > 0) {
          setForm(f => ({ ...f, product_id: r.data[0].product_id }));
        }
      })
      .catch(console.error)
  }, [])

  const selectedProduct = products.find(p => p.product_id === Number(form.product_id))
  const estimatedTotal  = selectedProduct ? selectedProduct.price * form.quantity : 0

  const handleSubmit = async () => {
    if (!form.product_id) return;
    if (Number(form.quantity) <= 0) {
      setToast({ type: "error", msg: "❌ Số lượng phải lớn hơn 0" });
      return;
    }
    setLoading(true)
    setToast(null)
    try {
      const res = await noahApi.createOrder({
        user_id: Number(form.user_id),
        product_id: Number(form.product_id),
        quantity: Number(form.quantity)
      });
      setToast({ type: "success", msg: `✅ Đơn hàng #${res.data.order_id} đã được ghi nhận!` })
    } catch (e) {
      setToast({ type: "error", msg: `❌ Lỗi: ${typeof e.message === 'object' ? JSON.stringify(e.message) : e.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart size={20} className="text-orange-500" />
          <h3 className="font-semibold text-slate-800">Tạo đơn hàng mới</h3>
        </div>

        {/* User ID */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">User ID</label>
          <input
            type="number" min={1}
            value={form.user_id}
            onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Product */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Sản phẩm</label>
          <select
            value={form.product_id}
            onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {products.length === 0 && <option>Đang tải sản phẩm...</option>}
            {products.map(p => (
              <option key={p.product_id} value={p.product_id}>
                {p.name} — {formatVND(p.price)} (Còn {p.stock})
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Số lượng</label>
          <input
            type="number" min={1}
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {/* Estimate */}
        {selectedProduct && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Ước tính:</span>
              <span className="font-bold text-orange-600 text-lg">{formatVND(estimatedTotal)}</span>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !form.product_id}
          className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
          {loading ? "Đang gửi đơn hàng..." : "Đặt hàng ngay"}
        </button>

        {/* Toast */}
        {toast && (
          <div className={`flex items-start gap-2 p-4 rounded-xl text-sm border ${toast.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
            {toast.type === "success" ? <CheckCircle size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />}
            <span className="font-medium">{toast.msg}</span>
          </div>
        )}
      </div>
    </div>
  )
}
