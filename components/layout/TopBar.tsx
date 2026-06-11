"use client";

import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";

export function TopBar() {
  const { isSignedIn } = useAuth();

  return (
    <div className="flex min-h-14 min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2 md:gap-3">
      {isSignedIn ? (
        <>
          <button
            type="button"
            className="rounded-full bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-brand-700 sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Buy</span>
            <span className="hidden sm:inline">Buy credits</span>
          </button>
          <div className="rounded-lg border border-surface-border bg-white px-2 py-1 text-xs text-slate-600 sm:px-3 sm:py-1.5 sm:text-sm">
            <span className="tabular-nums">0</span>
            <span className="hidden sm:inline"> credits</span>
          </div>
          <button
            type="button"
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:inline-flex"
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button
            type="button"
            className="hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:inline-flex"
            aria-label="Settings"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 sm:h-9 sm:w-9",
              },
            }}
          />
        </>
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            Sign in
          </button>
        </SignInButton>
      )}
    </div>
  );
}
