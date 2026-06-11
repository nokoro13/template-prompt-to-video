import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/LandingPage";
import { checkUserHasSubscription } from "@/lib/billing/check-subscription";

export default async function HomePage() {
  const { userId, has } = await auth();
  const hasSubscription = userId
    ? await checkUserHasSubscription(userId, has)
    : false;

  if (userId && hasSubscription) {
    redirect("/dashboard");
  }

  return <LandingPage hasSubscription={hasSubscription} />;
}
