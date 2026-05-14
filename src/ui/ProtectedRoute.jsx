import { Navigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="glass rounded-2xl px-6 py-4 text-sm text-white/70">
          Loading…
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

