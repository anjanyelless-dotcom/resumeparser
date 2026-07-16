import Button from "../../../components/common/Button";


interface FooterButtonsProps {
  onBack?: () => void;
  backLabel?: string;
  continueLabel?: string;
  continueType?: "button" | "submit";
  onContinue?: () => void;
  disabled?: boolean;
}

export function FooterButtons({
  onBack,
  backLabel = "Back",
  continueLabel = "Save & Continue",
  continueType = "submit",
  onContinue,
  disabled,
}: FooterButtonsProps) {
  return (
    <div className="sticky bottom-0 z-20 mt-8 border-t border-slate-200 bg-white px-2 py-4">
      <div className="mx-auto flex max-w-4xl justify-end gap-3">
        {onBack && (
          <Button variant="secondary" type="button" onClick={onBack} className="min-w-24">
            {backLabel}
          </Button>
        )}
        <Button type={continueType} onClick={onContinue} disabled={disabled} className="min-w-36">
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}