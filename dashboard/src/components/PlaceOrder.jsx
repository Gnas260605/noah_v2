import { useEffect, useState } from "react"
import { noahApi } from "../services/api"
import { ShoppingCart, CheckCircle, XCircle, RefreshCw, Package, User, CreditCard, Info, AlertCircle } from "lucide-react"

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
    
    const qty = Number(form.quantity);
    if (qty <= 0) {
      setToast({ type: "error", msg: "❌ Số lượng phải lớn hơn 0" });
      return;
    }

    // KIỂM TRA TỒN KHO NGAY TẠI FRONTEND
    if (selectedProduct && qty > selectedProduct.stock) {
      setToast({ 
        type: "error", 
        msg: `❌ Không đủ hàng! Hiện chỉ còn ${selectedProduct.stock} sản phẩm trong kho.` 
      });
      return;
    }

    setLoading(true)
    setToast(null)
    try {
      const res = await noahApi.createOrder({
        user_id: Number(form.user_id),
        product_id: Number(form.product_id),
        quantity: qty
      });
      setToast({ type: "success", msg: `✅ Đơn hàng #${res.data.order_id} đã được ghi nhận!` })
    } catch (e) {
      // Xử lý lỗi từ backend (bao gồm cả lỗi tồn kho nếu frontend chưa kịp update)
      const errorMsg = e.response?.data?.detail || e.message;
      setToast({ type: "error", msg: `❌ Lỗi: ${errorMsg}` });
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Left Column: Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex items-center gap-3">
          <div className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Tạo đơn hàng mới</h3>
            <p className="text-xs text-slate-500 font-medium">Hoàn tất thông tin để đặt hàng</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* User ID */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <User size={16} className="text-slate-400" />
              Mã khách hàng (User ID)
            </label>
            <input
              type="number" min={1}
              value={form.user_id}
              onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white bg-slate-50 transition-all"
            />
          </div>

          {/* Product */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Package size={16} className="text-slate-400" />
              Chọn sản phẩm
            </label>
            <select
              value={form.product_id}
              onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white bg-slate-50 transition-all appearance-none cursor-pointer"
            >
              {products.length === 0 && <option>Đang tải sản phẩm...</option>}
              {products.map(p => (
                <option key={p.product_id} value={p.product_id}>
                  {p.name} — {formatVND(p.price)}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <CreditCard size={16} className="text-slate-400" />
              Số lượng đặt mua
            </label>
            <input
              type="number" 
              min={1}
              value={form.quantity}
              onChange={e => {
                const val = e.target.value;
                // Chặn nhập số âm hoặc 0 ngay lập tức
                if (val !== "" && Number(val) <= 0) return;
                setForm(f => ({ ...f, quantity: val }));
              }}
              className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all ${
                selectedProduct && Number(form.quantity) > selectedProduct.stock 
                  ? "border-red-500 bg-red-50 focus:ring-red-500 ring-2 ring-red-100" 
                  : "border-slate-200 bg-slate-50 focus:ring-orange-400 focus:bg-white"
              }`}
              placeholder="Nhập số lượng..."
            />
            {selectedProduct && Number(form.quantity) > selectedProduct.stock && (
              <p className="text-[11px] text-red-600 font-bold mt-2 flex items-center gap-1 animate-pulse">
                <AlertCircle size={14} />
                CẢNH BÁO: Vượt quá tồn kho ({selectedProduct.stock})
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={
              loading || 
              !form.product_id || 
              !form.quantity || 
              Number(form.quantity) <= 0 || 
              (selectedProduct && Number(form.quantity) > selectedProduct.stock)
            }
            className={`w-full py-4 text-white rounded-xl font-bold transition-all shadow-xl flex items-center justify-center gap-3 text-base ${
              selectedProduct && Number(form.quantity) > selectedProduct.stock
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-slate-900 hover:bg-slate-800 shadow-slate-100"
            }`}
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
            {loading ? "Đang xử lý..." : "Xác nhận đặt hàng"}
          </button>

          {/* Toast */}
          {toast && (
            <div className={`flex items-start gap-3 p-4 rounded-xl text-sm border animate-in fade-in slide-in-from-top-2 duration-300 ${toast.type === "success" ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"}`}>
              {toast.type === "success" ? <CheckCircle size={20} className="shrink-0" /> : <XCircle size={20} className="shrink-0" />}
              <span className="font-semibold">{toast.msg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Preview & Summary */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6">
            <Info size={18} className="text-blue-500" />
            <h4 className="font-bold text-slate-800">Chi tiết đơn hàng</h4>
          </div>

          {selectedProduct ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                  <Package size={32} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900">{selectedProduct.name}</h5>
                  <p className="text-xs text-slate-500 font-mono">ID: #{selectedProduct.product_id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Đơn giá</span>
                  <span className="font-semibold text-slate-800">{formatVND(selectedProduct.price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Số lượng</span>
                  <span className="font-semibold text-slate-800">x {form.quantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Trạng thái kho</span>
                  <span className={`font-bold ${selectedProduct.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                    {selectedProduct.stock > 0 ? `Còn ${selectedProduct.stock} sản phẩm` : "Hết hàng"}
                  </span>
                </div>
                <div className="h-px bg-slate-100 my-2" />
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-900 text-base">Tổng cộng</span>
                  <span className="font-black text-orange-600 text-2xl">{formatVND(estimatedTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Package size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Vui lòng chọn sản phẩm để xem trước</p>
            </div>
          )}
        </div>


      </div>
    </div>
  )
}
