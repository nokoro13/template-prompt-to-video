"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";

type LandingScrollContextValue = {
  scrollElement: HTMLElement | null;
};

const LandingScrollContext = createContext<LandingScrollContextValue | null>(
  null,
);

export function LandingScrollProvider({
  scrollElement,
  children,
}: {
  scrollElement: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <LandingScrollContext.Provider value={{ scrollElement }}>
      {children}
    </LandingScrollContext.Provider>
  );
}

export function useLandingScrollElement() {
  return useContext(LandingScrollContext)?.scrollElement ?? null;
}

export function useLandingScrollTo() {
  const scrollElement = useLandingScrollElement();

  return useCallback(
    (id: string) => {
      const target = document.getElementById(id);
      if (!scrollElement || !target) return;

      const header = scrollElement.querySelector("header");
      const offset =
        (header?.getBoundingClientRect().height ?? 72) + 8;
      const rootTop = scrollElement.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;

      scrollElement.scrollTo({
        top: scrollElement.scrollTop + targetTop - rootTop - offset,
        behavior: "smooth",
      });
    },
    [scrollElement],
  );
}
