import { useFinishParentOnboarding } from "../../navigation/parentOnboardingGate";
import { OnboardingCompleteScreen } from "./OnboardingCompleteScreen";

export function ParentOnboardingCompleteScreen() {
  const finish = useFinishParentOnboarding();
  return <OnboardingCompleteScreen variant="parent" onContinue={finish} />;
}
