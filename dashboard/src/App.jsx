import { useState } from "react"
import { LayoutDashboard, ShoppingCart, Package, Bot, Store } from "lucide-react"
import Overview from "./components/Overview"
import OrderTable from "./components/OrderTable"
import InventoryPanel from "./components/InventoryPanel"
import PlaceOrder from "./components/PlaceOrder"

const API = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8888"

const navItems = [
  { id: "overview",   label: "Tổng quan",  icon: LayoutDashboard },
  { id: "orders",     label: "Đơn hàng",   icon: ShoppingCart },
  { id: "inventory",  label: "Kho hàng",   icon: Package },
  { id: "place",      label: "Đặt hàng",   icon: Store },
]

export default function App() {
  const [active, setActive] = useState("overview")

  const renderContent = () => {
    switch (active) {
      case "overview":   return <Overview />
      case "orders":     return <OrderTable />
      case "inventory":  return <InventoryPanel />
      case "place":      return <PlaceOrder />
      default:           return <Overview />
    }
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-orange-500 tracking-wider">NOAH</h1>
          <p className="text-slate-400 text-xs mt-1">Unified Commerce</p>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${active === id
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700">
          <p className="text-slate-500 text-xs">CMU-CS 445 — Group Project</p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {navItems.find(n => n.id === active)?.label}
            </h2>
            <p className="text-slate-500 text-sm">NOAH Retail — Hệ thống tích hợp thống nhất</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Live
          </span>
        </header>
        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
