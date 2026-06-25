import { Home, Map, IndianRupee, User } from "lucide-react";
import { parseQueryRouting, navigateToQueryPath } from "../../../App";

const tabs = [
  { to: "", icon: Home, label: "Home" },
  { to: "trips", icon: Map, label: "Trips" },
  { to: "earnings", icon: IndianRupee, label: "Earnings" },
  { to: "profile", icon: User, label: "Profile" },
];

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  const { subPath } = parseQueryRouting();
  
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">V</span>
          </div>
          <h1 className="text-base font-bold text-gray-900">VillageMart <span className="text-amber-600">Transport</span></h1>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online" />
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const isActive = subPath === tab.to;
            return (
              <button key={tab.to} onClick={() => navigateToQueryPath("transport", tab.to)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px] ${
                  isActive ? "text-amber-600" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-amber-50" : ""}`}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-amber-700" : "text-gray-400"}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
