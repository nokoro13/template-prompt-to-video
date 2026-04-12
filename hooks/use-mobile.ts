import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Used by the shadcn Sidebar: must match server render (false) on first paint,
 * then sync from window before paint so mobile sheet / desktop rail behave correctly.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useLayoutEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
