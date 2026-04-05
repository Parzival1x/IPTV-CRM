import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { customerPortalAuthService } from "../services/customerPortalAuth";

export default function CustomerProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(
    customerPortalAuthService.isAuthenticated()
  );

  useEffect(() => {
    let isMounted = true;

    const validate = async () => {
      const valid = await customerPortalAuthService.validateSession();

      if (isMounted) {
        setIsAuthenticated(valid);
        setIsChecking(false);
      }
    };

    validate();

    const sync = () => {
      setIsAuthenticated(customerPortalAuthService.isAuthenticated());
    };

    window.addEventListener("storage", sync);
    window.addEventListener("auth:changed", sync);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:changed", sync);
    };
  }, []);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-cyan-600" />
          <p className="mt-4 text-sm text-slate-500">Checking portal session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/signin" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
