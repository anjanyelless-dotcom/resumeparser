import { Check } from "lucide-react";
import { WIZARD_STEPS, useApplicationContext } from "../context/ApplicationContext";

export function ProgressStepper() {
  const { currentStep, highestCompletedStepIndex, setCurrentStep } = useApplicationContext();

  const visibleSteps = currentStep === "account" ? WIZARD_STEPS : WIZARD_STEPS.slice(1);
  const visibleCurrentIndex = Math.max(0, visibleSteps.findIndex((step) => step.id === currentStep));
  const totalSegments = Math.max(1, visibleSteps.length - 1);
  const connectorProgress = (visibleCurrentIndex / totalSegments) * 100;

  return (
    <div className="border-b border-slate-200 bg-white py-6">
      <div className="mx-auto max-w-5xl px-4">
        <ol className={`relative gap-1 ${visibleSteps.length === 6 ? "grid grid-cols-6" : "grid grid-cols-7"}`}>
          <div className="absolute left-[7.8%] right-[7.8%] top-3.5 h-[2px] bg-slate-300">
            <div className="h-full bg-[#0a1230]" style={{ width: `${connectorProgress}%` }} />
          </div>
          {visibleSteps.map((step, index) => {
            const absoluteIndex = WIZARD_STEPS.findIndex((item) => item.id === step.id);
            const isCompleted = index < visibleCurrentIndex;
            const isCurrent = index === visibleCurrentIndex;
            const isAccessible = absoluteIndex <= highestCompletedStepIndex + 1;

            return (
              <li key={step.id} className="relative z-10 text-center">
                <button
                  type="button"
                  disabled={!isAccessible}
                  onClick={() => setCurrentStep(step.id)}
                  className={`w-full transition ${!isAccessible ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span
                    className={`mx-auto mb-2 flex h-7 w-7 items-center justify-center rounded-full border bg-white ${
                      isCurrent ? "border-[#0a1230] bg-[#0a1230]" : "border-transparent"
                    } ${isCompleted ? "border-[#0a1230] bg-[#0a1230]" : ""}`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span
                        className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${
                          isCurrent ? "bg-white" : "bg-slate-300"
                        }`}
                      />
                    )}
                  </span>
                  <p
                    className={`text-[12px] font-medium leading-tight ${
                      isCurrent ? "font-semibold text-slate-800" : "text-slate-700"
                    }`}
                  >
                    {step.label}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}