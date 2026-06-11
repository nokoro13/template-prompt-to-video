"use client";

import Link from "next/link";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

type LandingAuthActionsProps = {
  hasSubscription: boolean;
};

export function LandingAuthActions({
  hasSubscription,
}: LandingAuthActionsProps) {
  const { isSignedIn } = useAuth();

  if (isSignedIn && hasSubscription) {
    return (
      <>
        <Button
          nativeButton={false}
          render={<Link href="/dashboard" />}
          className="h-8 shrink-0 rounded-full bg-slate-900 px-4 text-sm text-white hover:bg-slate-800 sm:h-9"
        >
          Dashboard
        </Button>
        <UserButton
          appearance={{
            elements: { avatarBox: "h-8 w-8 sm:h-9 sm:w-9" },
          }}
        />
      </>
    );
  }

  if (isSignedIn) {
    return (
      <>
        <Button
          nativeButton={false}
          render={<Link href="/pricing" />}
          className="h-8 shrink-0 rounded-full bg-slate-900 px-4 text-sm text-white hover:bg-slate-800 sm:h-9"
        >
          Subscribe
        </Button>
        <UserButton
          appearance={{
            elements: { avatarBox: "h-8 w-8 sm:h-9 sm:w-9" },
          }}
        />
      </>
    );
  }

  return (
    <>
      <SignInButton mode="modal">
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:h-9 sm:px-4"
        >
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="modal" forceRedirectUrl="/pricing">
        <button
          type="button"
          className="inline-flex h-8 shrink-0 items-center rounded-full bg-slate-900 px-3.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:h-9 sm:px-4"
        >
          Sign up
        </button>
      </SignUpButton>
    </>
  );
}
