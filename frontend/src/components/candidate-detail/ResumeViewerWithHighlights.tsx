import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scrollToResumeSpan } from "../../hooks/useScrollToField";

export type FieldMapping = {
  id: string;
  value: string;
  label?: string;
};

type ResumeViewerWithHighlightsProps = {
  html?: string | null;
  pdfUrl?: string | null;
  emptyMessage?: string;
  fieldMappings: FieldMapping[];
  activeFieldId: string | null;
  onFieldClick: (fieldId: string, value: string, label: string) => void;
  scrollToFieldId: string | null;
  onScrollComplete?: () => void;
};

function injectFieldSpans(
  html: string,
  fieldMappings: FieldMapping[],
  activeFieldId: string | null,
): string {
  let result = html;

  result = result.replace(
    /<mark[^>]*data-resume-field[^>]*>([\s\S]*?)<\/mark>/g,
    "$1",
  );
  result = result.replace(
    /<span[^>]*data-resume-field[^>]*>([\s\S]*?)<\/span>/g,
    "$1",
  );

  const sorted = [...fieldMappings]
    .filter((f) => f.value && f.value.trim().length > 2)
    .sort((a, b) => (b.value?.length ?? 0) - (a.value?.length ?? 0));

  for (const { id, value } of sorted) {
    const cleanValue = value.trim();
    if (!cleanValue) continue;

    const isActive = activeFieldId === id;
    const activeStyle =
      "background-color: #fde68a; color: #92400e; padding: 1px 8px; border-radius: 999px; cursor: pointer; font-weight: 500;";

    let inactiveStyle: string;
    if (id.includes("skill") || id === "skills") {
      // 🔵 Skills → light blue pill
      inactiveStyle =
        "background-color: #e0f2fe; color: #0369a1; padding: 1px 8px; border-radius: 999px; cursor: pointer;";
    } else if (
      id.includes("education") ||
      id === "degree" ||
      id === "institution"
    ) {
      // 🟠 Education → light orange pill
      inactiveStyle =
        "background-color: #ffedd5; color: #c2410c; padding: 1px 8px; border-radius: 999px; cursor: pointer;";
    } else if (
      id.includes("experience") ||
      id.includes("company") ||
      id.includes("role") ||
      id === "work_history"
    ) {
      // 🟡 Experience/Clients → light yellow pill
      inactiveStyle =
        "background-color: #fef9c3; color: #854d0e; padding: 1px 8px; border-radius: 999px; cursor: pointer;";
    } else if (
      id === "full_name" ||
      id === "email" ||
      id === "phone" ||
      id === "location"
    ) {
      // 🟢 Candidate details → light green pill
      inactiveStyle =
        "background-color: #dcfce7; color: #166534; padding: 1px 8px; border-radius: 999px; cursor: pointer;";
    } else {
      // default → light blue pill
      inactiveStyle =
        "background-color: #e0f2fe; color: #0369a1; padding: 1px 8px; border-radius: 999px; cursor: pointer;";
    }

    const style = isActive ? activeStyle : inactiveStyle;

    const escapedValue = cleanValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordBoundaryRegex = new RegExp(
      `(?![^<]*>)\\b${escapedValue}\\b`,
      "gi",
    );

    result = result.replace(wordBoundaryRegex, (match) => {
      if (match.includes("data-resume-field") || match.includes("style=")) {
        return match;
      }
      return `<mark data-resume-field="${id}" data-value="${cleanValue.replace(/"/g, "&quot;")}" style="${style}">${match}</mark>`;
    });
  }

  return result;
}

export default function ResumeViewerWithHighlights({
  html,
  pdfUrl = null,
  emptyMessage = "Loading resume…",
  fieldMappings,
  activeFieldId,
  onFieldClick,
  scrollToFieldId,
  onScrollComplete,
}: ResumeViewerWithHighlightsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: string;
    label: string;
  } | null>(null);

  const processedHtml = useMemo(() => {
    if (!html) return "";
    return injectFieldSpans(html, fieldMappings, activeFieldId);
  }, [html, fieldMappings, activeFieldId]);

  useEffect(() => {
    if (!scrollToFieldId || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-resume-field="${scrollToFieldId}"]`,
    ) as HTMLElement | null;
    if (el) {
      el.classList.add("resume-field-highlight-animate");
      scrollToResumeSpan(containerRef.current, scrollToFieldId);
      const t = setTimeout(() => {
        el.classList.remove("resume-field-highlight-animate");
        onScrollComplete?.();
      }, 1500);
      return () => clearTimeout(t);
    }
    onScrollComplete?.();
  }, [scrollToFieldId, onScrollComplete]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest(
        "[data-resume-field]",
      ) as HTMLElement | null;
      if (!target) {
        setTooltip(null);
        return;
      }
      e.preventDefault();
      const fieldId = target.dataset.resumeField ?? "";
      const value = target.dataset.value ?? "";

      // ✅ CHANGE 2: Redirect by field type
      if (fieldId.includes("skill") || fieldId === "skills") {
        onFieldClick("skills", value, "Skills");
      } else if (
        fieldId === "full_name" ||
        fieldId === "email" ||
        fieldId === "phone" ||
        fieldId === "location"
      ) {
        onFieldClick("full_name", value, "Candidate Details");
      } else if (
        fieldId.includes("education") ||
        fieldId === "degree" ||
        fieldId === "institution"
      ) {
        onFieldClick("education", value, "Education");
      } else if (fieldId.includes("experience_company")) {
        // 🟡 Clients → highlight like skills (no navigation)
        onFieldClick("skills", value, "Clients");
      } else if (fieldId.includes("experience_role")) {
        // 🟡 Experience roles → highlight like skills (no navigation)
        onFieldClick("skills", value, "Experience Roles");
      } else if (fieldId === "work_history") {
        // 🟡 Work history → highlight like skills (no navigation)
        onFieldClick("skills", value, "Work History");
      } else if (
        fieldId === "full_name" ||
        fieldId === "email" ||
        fieldId === "phone" ||
        fieldId === "location"
      ) {
        onFieldClick("full_name", value, "Candidate Details");
      }

      setTooltip({
        x: e.clientX,
        y: e.clientY,
        value,
        label: fieldId,
      });
      const hideTooltip = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("[data-resume-tooltip]")) return;
        setTooltip(null);
        window.removeEventListener("click", hideTooltip);
        window.removeEventListener("scroll", hideTooltip);
      };
      requestAnimationFrame(() => {
        window.addEventListener("click", hideTooltip);
        window.addEventListener("scroll", hideTooltip);
      });
    },
    [onFieldClick],
  );

  if (pdfUrl && !html) {
    return (
      <div className="flex h-full min-h-[400px] flex-col">
        <p className="mb-2 text-xs text-slate-500">
          PDF viewer: Click-to-highlight works best with DOCX. Use Download to
          save.
        </p>
        <iframe
          src={pdfUrl}
          className="min-h-[500px] flex-1 rounded-lg border-0"
          title="Resume PDF"
        />
      </div>
    );
  }

  if (!processedHtml) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        onClick={handleClick}
        className="resume-viewer-content h-full overflow-auto rounded-lg border border-slate-200 bg-white p-6"
      >
        <div
          className="prose prose-slate max-w-none prose-p:text-slate-700 prose-headings:text-slate-900"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </div>

      {tooltip && (
        <div
          data-resume-tooltip
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-slate-800 px-3 py-2 shadow-lg transition-opacity duration-200"
          style={{
            left: Math.min(
              Math.max(tooltip.x - 100, 8),
              window.innerWidth - 220,
            ),
            top: Math.max(tooltip.y - 56, 8),
          }}
        >
          <p className="text-sm font-medium text-white">{tooltip.value}</p>
          <p className="text-xs text-slate-300">{tooltip.label}</p>
        </div>
      )}
    </div>
  );
}
