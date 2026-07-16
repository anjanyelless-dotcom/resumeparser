import { useEffect } from "react";

const SCROLL_OPTIONS: ScrollIntoViewOptions = {
  behavior: "smooth",
  block: "center",
};

/**
 * Scrolls a target element into view when scrollToFieldId changes.
 * Bidirectional scroll linking: resume span ↔ panel field.
 *
 * @param scrollToFieldId - Field id that triggers scroll (e.g. from resume or panel click)
 * @param getElement - Returns the DOM element to scroll into view (use refs)
 * @param onComplete - Called after scroll (e.g. to clear the trigger)
 */
export function useScrollToField(
  scrollToFieldId: string | null,
  getElement: (fieldId: string) => HTMLElement | null,
  onComplete?: () => void,
) {
  useEffect(() => {
    if (!scrollToFieldId) return;
    const el = getElement(scrollToFieldId);
    if (el) {
      el.scrollIntoView(SCROLL_OPTIONS);
      onComplete?.();
    }
  }, [scrollToFieldId, getElement, onComplete]);
}

/**
 * Scrolls to a field span inside a container (e.g. resume viewer).
 * Use when the target has data-resume-field attribute.
 */
export function scrollToResumeSpan(
  container: HTMLElement | null,
  fieldId: string,
  onComplete?: () => void,
): void {
  if (!container) return;
  const el = container.querySelector(
    `[data-resume-field="${fieldId}"]`,
  ) as HTMLElement | null;
  if (el) {
    el.scrollIntoView(SCROLL_OPTIONS);
    onComplete?.();
  }
}
