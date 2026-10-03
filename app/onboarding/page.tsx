import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { getOnboardingContextAction } from "@/app/actions/onboarding"
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard"

export default async function OnboardingPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // If the user has already completed onboarding, proceed straight to the dashboard
  if (session.hasCompletedOnboarding) {
    redirect("/dashboard")
  }

  const contextData = await getOnboardingContextAction()
  if (!contextData) {
    redirect("/login")
  }

  return <OnboardingWizard initialData={contextData} />
}
