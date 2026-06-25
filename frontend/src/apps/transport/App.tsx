import { Toaster } from "react-hot-toast";
import TransportLayout from "./components/TransportLayout";
import TransportHome from "./pages/TransportHome";
import Trips from "./pages/Trips";
import Earnings from "./pages/Earnings";
import DriverProfile from "./pages/DriverProfile";
import DriverLogin from "./pages/DriverLogin";
import DriverSignup from "./pages/DriverSignup";
import { getStoredTransportUser } from "./api";
import { parseQueryRouting, navigateToQueryPath } from "../../App";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredTransportUser();
  const role = localStorage.getItem("role")?.toUpperCase();

  // ✅ FIXED: Accept TRANSPORT, DRIVER, and ADMIN roles (case-insensitive) 🎯
  const allowedRoles = ["TRANSPORT", "DRIVER", "RIDER", "ADMIN"];
  if (!user || !role || !allowedRoles.includes(role)) {
    console.warn("🔐 Access denied to Transport dashboard. Role:", role);
    navigateToQueryPath("transport", "login");
    return null;
  }

  return <>{children}</>;
}

export default function TransportApp() {
  const { subPath } = parseQueryRouting();

  const renderContent = () => {
    switch (subPath) {
      case "login":
        return <DriverLogin />;
      case "signup":
        return <DriverSignup />;
      case "trips":
        return <ProtectedRoute><TransportLayout><Trips /></TransportLayout></ProtectedRoute>;
      case "earnings":
        return <ProtectedRoute><TransportLayout><Earnings /></TransportLayout></ProtectedRoute>;
      case "profile":
        return <ProtectedRoute><TransportLayout><DriverProfile /></TransportLayout></ProtectedRoute>;
      default:
        return <ProtectedRoute><TransportLayout><TransportHome /></TransportLayout></ProtectedRoute>;
    }
  };

  return (
    <>
      <Toaster position="top-center"
        toastOptions={{
          duration: 2500,
          style: { borderRadius: "16px", padding: "12px 18px", fontSize: "14px", fontWeight: "500", maxWidth: "90vw" },
          success: { style: { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" } },
          error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
        }}
      />
      {renderContent()}
    </>
  );
}
