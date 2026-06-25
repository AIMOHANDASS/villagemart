import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  PartyPopper,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown,
  Store,
  RefreshCcw,
} from "lucide-react";
import { parseQueryRouting, navigateToQueryPath } from "../../../App";
import { forceReloadApps } from "../api";
import { toast } from "react-hot-toast";

const navItems = [
  { to: "", icon: LayoutDashboard, label: "Dashboard" },
  { to: "orders", icon: ShoppingCart, label: "Orders" },
  { to: "products", icon: Package, label: "Products" },
  { to: "users", icon: Users, label: "Users" },
  { to: "partners", icon: Truck, label: "Partners" },
  { to: "transport", icon: Truck, label: "Transport" },
  { to: "party-hall", icon: PartyPopper, label: "Party Hall" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { subPath } = parseQueryRouting();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSystemSignOut = () => {
    localStorage.removeItem("admin_user");
    localStorage.removeItem("jwt_token_admin");
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("token");
    sessionStorage.clear();

    const currentAppScope = searchParams.get("app") || "";
    
    if (currentAppScope.startsWith("delivery")) {
      navigate("/?app=delivery/login", { replace: true });
    } else if (currentAppScope.startsWith("transport")) {
      navigate("/?app=transport/login", { replace: true });
    } else if (currentAppScope.startsWith("admin")) {
      navigate("/?app=admin/login", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-green-700/30">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Store className="w-6 h-6 text-white" />
        </div>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="overflow-hidden"
          >
            <h1 className="text-lg font-bold text-white tracking-tight">VillageMart</h1>
            <p className="text-[11px] text-green-200/70 font-medium">Admin Panel</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = subPath === item.to;
          return (
            <button
              key={item.to}
              onClick={() => {
                setMobileOpen(false);
                navigateToQueryPath("admin", item.to);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-white/20 text-white shadow-lg shadow-green-900/20"
                  : "text-green-100/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Actions */}
      <div className="px-3 py-4 border-t border-green-700/30 flex flex-col gap-2">
        <button
          onClick={async () => {
            try {
              await forceReloadApps();
              toast.success("Broadcast sent! All apps are reloading.");
            } catch {
              toast.error("Failed to send broadcast");
            }
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-100 hover:bg-amber-500/20 hover:text-amber-300 transition-all w-full"
        >
          <RefreshCcw className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>Force Reload Apps</span>}
        </button>

        <button
          onClick={handleSystemSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-green-100/70 hover:bg-red-500/20 hover:text-red-200 transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 260 : 76 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex flex-col bg-gradient-to-b from-[#15803d] to-[#166534] shadow-2xl z-30 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-[260px] bg-gradient-to-b from-[#15803d] to-[#166534] shadow-2xl z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-4 lg:px-6 shadow-sm z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 w-72 border border-gray-200 focus-within:border-[var(--color-primary)] focus-within:ring-2 focus-within:ring-green-100 transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search orders, products..."
                className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </button>

            {/* Admin Profile */}
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">Admin</p>
                <p className="text-[11px] text-gray-500">Super Admin</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
