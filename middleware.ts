import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { checkUserHasSubscription } from "@/lib/billing/check-subscription";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing(.*)",
  "/api/health(.*)",
]);

const isSubscriptionRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/styles(.*)",
  "/projects(.*)",
  "/explore(.*)",
  "/studio(.*)",
  "/video-editor(.*)",
  "/api(.*)",
]);

const isPublicApiRoute = createRouteMatcher([
  "/api/health(.*)",
  "/api/billing/status(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return;
  }

  const authState = await auth();
  if (!authState.userId) {
    await auth.protect();
    return;
  }

  if (
    isSubscriptionRoute(req) &&
    !isPublicApiRoute(req) &&
    !(await checkUserHasSubscription(authState.userId, (params) =>
      authState.has(
        params as Parameters<typeof authState.has>[0],
      ),
    ))
  ) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Active subscription required" },
        { status: 403 },
      );
    }

    const pricingUrl = new URL("/pricing", req.url);
    return NextResponse.redirect(pricingUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
