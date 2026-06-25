import { Toaster } from "react-hot-toast";
import DeliveryLayout from "./components/DeliveryLayout";
import DeliveryHome from "./pages/DeliveryHome";
import DeliveryProfile from "./pages/DeliveryProfile";
import DeliveryEarnings from "./pages/DeliveryEarnings";
import DeliveryLogin from "./pages/DeliveryLogin";
import DeliverySignup from "./pages/DeliverySignup";
import { getStoredDeliveryUser } from "./api";
import { parseQueryRouting, navigateToQueryPath } from "../../App";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredDeliveryUser();
  const role = localStorage.getItem("role")?.toUpperCase();
  
  // ✅ FIXED: Accept DELIVERY, DRIVER, and ADMIN roles (case-insensitive) 🎯
  const allowedRoles = ["DELIVERY", "DRIVER", "ADMIN"];
  if (!user || !role || !allowedRoles.includes(role)) {
    console.warn("🔐 Access denied to Delivery dashboard. Role:", role);
    navigateToQueryPath("delivery", "login");
    return null;
  }
  
  return <>{children}</>;
}

export default function DeliveryApp() {
  const { subPath } = parseQueryRouting();

  const renderContent = () => {
    switch (subPath) {
      case "login":
        return <DeliveryLogin />;
      case "signup":
        return <DeliverySignup />;
      case "orders":
        return <ProtectedRoute><DeliveryLayout><DeliveryHome /></DeliveryLayout></ProtectedRoute>;
      case "earnings":
        return <ProtectedRoute><DeliveryLayout><DeliveryEarnings /></DeliveryLayout></ProtectedRoute>;
      case "profile":
        return <ProtectedRoute><DeliveryLayout><DeliveryProfile /></DeliveryLayout></ProtectedRoute>;
      default:
        return <ProtectedRoute><DeliveryLayout><DeliveryHome /></DeliveryLayout></ProtectedRoute>;
    }
  };

  return (
    <>
      <Toaster position="top-center"
        toastOptions={{
          duration: 2500,
          style: { borderRadius: "16px", padding: "12px 18px", fontSize: "14px", fontWeight: "500", maxWidth: "90vw" },
          success: { style: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" } },
          error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
        }}
      />
      {renderContent()}
    </>
  );
}
