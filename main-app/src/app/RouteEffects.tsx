import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reset the viewport and keyboard focus when a client-side page changes. */
export function RouteEffects() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof document !== "undefined") {
      document.title = pathname.startsWith("/sales")
        ? "GOELTA · Sales Workspace"
        : "GOELTA · Business Workspace";
      document.getElementById("main")?.focus({ preventScroll: true });
    }
  }, [pathname]);

  return null;
}
