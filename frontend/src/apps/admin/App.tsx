import { Toaster } from "react-hot-toast";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Products from "./pages/Products";
import UsersPage from "./pages/UsersPage";
import TransportPage from "./pages/TransportPage";
import PartyHallPage from "./pages/PartyHallPage";
import PartnersPage from "./pages/PartnersPage";
import Login from "./pages/Login";
import { getStoredAdmin } from "./api";
import { parseQueryRouting, navigateToQueryPath } from "../../App";
import PrivacyPolicy from "../../pages/PrivacyPolicy";
import TermsOfService from "../../pages/TermsOfService";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const admin = getStoredAdmin();
  if (!admin) {
    navigateToQueryPath("admin", "login");
    return null;
  }
  return <>{children}</>;
}

export default function AdminApp() {
  const { subPath } = parseQueryRouting();

  const renderContent = () => {
    switch (subPath) {
      case "login":
        return <Login />;
      case "privacy":
        return <PrivacyPolicy />;
      case "terms":
        return <TermsOfService />;
      case "orders":
        return <ProtectedRoute><AdminLayout><Orders /></AdminLayout></ProtectedRoute>;
      case "products":
        return <ProtectedRoute><AdminLayout><Products /></AdminLayout></ProtectedRoute>;
      case "users":
        return <ProtectedRoute><AdminLayout><UsersPage /></AdminLayout></ProtectedRoute>;
      case "partners":
        return <ProtectedRoute><AdminLayout><PartnersPage /></AdminLayout></ProtectedRoute>;
      case "transport":
        return <ProtectedRoute><AdminLayout><TransportPage /></AdminLayout></ProtectedRoute>;
      case "party-hall":
        return <ProtectedRoute><AdminLayout><PartyHallPage /></AdminLayout></ProtectedRoute>;
      default:
        return <ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>;
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: "16px", padding: "14px 20px", fontSize: "14px", fontWeight: "500", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" },
          success: { style: { background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }, iconTheme: { primary: "#10b981", secondary: "#fff" } },
          error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }, iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      {renderContent()}
    </>
  );
}
