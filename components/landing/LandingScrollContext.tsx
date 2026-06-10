"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
  type RefObject,
} from "react";

const LandingScrollContext =
  createContext<RefObject<HTMLElement | null> | null>(null);

export function LandingScrollProvider({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  return (
    <LandingScrollContext.Provider value={scrollRef}>
      {children}
    </LandingScrollContext.Provider>
  );
}

export function useLandingScrollTo() {
  const scrollRoot = useContext(LandingScrollContext);

  return useCallback(
    (id: string) => {
      const root = scrollRoot?.current;
      const target = document.getElementById(id);
      if (!root || !target) return;

      const header = root.querySelector("header");
      const offset =
        (header?.getBoundingClientRect().height ?? 72) + 8;
      const rootTop = root.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;

      root.scrollTo({
        top: root.scrollTop + targetTop - rootTop - offset,
        behavior: "smooth",
      });
    },
    [scrollRoot],
  );
}

export function useLandingScrollRoot() {
  return useContext(LandingScrollContext);
}
