import { useMemo } from "react";
import { AlertTriangle, Eye, EyeOff, Save, Undo2, Redo2 } from "lucide-react";
import Button from "../common/Button";
import EditableField from "./EditableField";
import { confidenceTone, confidenceLabel } from "../../utils/confidence";

type CorrectionSplitViewProps = {
  resumeUrl?: string | null;
  resumeError?: string | null;
  parsedData: Record<string, any>;
  originalData: Record<string, any>;
  workHistory: Array<any>;
  originalWorkHistory: Array<any>;
  onWorkHistoryChange: (
    workHistoryId: string,
    field: string,
    value: string,
  ) => void;
  certifications: Array<any>;
  originalCertifications: Array<any>;
  onCertificationChange: (
    certificationId: string,
    field: string,
    value: string,
  ) => void;
  flaggedFields: Record<string, number>;
  discrepancies: string[];
  compareMode: boolean;
  onToggleCompare: () => void;
  onFieldChange: (path: string, value: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  canUndo: boolean;
  canRedo: boolean;
  readOnly?: boolean;
};

export default function CorrectionSplitView({
  resumeUrl: _resumeUrl,
  resumeError: _resumeError,
  parsedData,
  originalData,
  workHistory,
  originalWorkHistory,
  onWorkHistoryChange,
  certifications,
  originalCertifications,
  onCertificationChange,
  flaggedFields,
  discrepancies,
  compareMode,
  onToggleCompare,
  onFieldChange,
  onUndo,
  onRedo,
  onSave,
  canUndo,
  canRedo,
  readOnly = false,
}: CorrectionSplitViewProps) {
  const contact = parsedData.contact || {};
  const originalContact = originalData.contact || {};

  const fields = useMemo(
    () => [
      {
        label: "Full name",
        path: "contact.name.name",
        flagKey: "name",
        value: contact?.name?.name || "",
        compare: originalContact?.name?.name || "",
        confidence: contact?.name?.confidence,
      },
      {
        label: "Primary email",
        path: "contact.emails.0.email",
        flagKey: "email",
        value: contact?.emails?.[0]?.email || "",
        compare: originalContact?.emails?.[0]?.email || "",
        confidence: contact?.emails?.[0]?.confidence,
      },
      {
        label: "Primary phone",
        path: "contact.phones.0.phone",
        flagKey: "phone",
        value: contact?.phones?.[0]?.phone || "",
        compare: originalContact?.phones?.[0]?.phone || "",
        confidence: contact?.phones?.[0]?.confidence,
      },
      {
        label: "Location",
        path: "contact.location.city",
        flagKey: "location",
        value: contact?.location?.city || "",
        compare: originalContact?.location?.city || "",
        confidence: contact?.location?.confidence,
      },
    ],
    [contact, originalContact, compareMode],
  );

  const skills = parsedData.skills || [];
  const originalSkills = originalData.skills || [];
  const education = parsedData.education || [];
  const originalEducation = originalData.education || [];

  return (
    <div className="grid gap-6 lg:grid-cols-">
      {/* <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-subtle">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Original resume</h3>
          <span className="text-xs text-slate-400">PDF view</span>
        </div>
        {resumeUrl ? (
          <iframe
            src={resumeUrl}
            className="mt-3 h-[640px] w-full rounded-lg border border-slate-200"
            title="Resume preview"
          />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            {resumeError || 'Resume preview unavailable.'}
          </div>
        )}
      </div> */}

      <div className="space-y-4">
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={onToggleCompare}
                icon={
                  compareMode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )
                }
              >
                {compareMode ? "Hide comparison" : "Compare original"}
              </Button>
              <Button
                variant="secondary"
                onClick={onUndo}
                disabled={!canUndo}
                icon={<Undo2 className="h-4 w-4" />}
              >
                Undo
              </Button>
              <Button
                variant="secondary"
                onClick={onRedo}
                disabled={!canRedo}
                icon={<Redo2 className="h-4 w-4" />}
              >
                Redo
              </Button>
            </div>
            <Button onClick={onSave} icon={<Save className="h-4 w-4" />}>
              Save corrections
            </Button>
          </div>
        )}

        {discrepancies.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" /> Discrepancies detected
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {discrepancies.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-3">
          {fields.map((field) => (
            <EditableField
              key={field.path}
              label={field.label}
              value={field.value}
              compareValue={field.compare}
              showComparison={compareMode}
              confidence={field.confidence}
              flagged={Boolean(
                flaggedFields[field.flagKey] ?? (field.confidence ?? 1) < 0.6,
              )}
              onSave={(next) => onFieldChange(field.path, next)}
              validator={(value) =>
                value.trim() ? null : "Value cannot be empty"
              }
              readOnly={readOnly}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Work history</h4>
          <div className="mt-3 space-y-3">
            {workHistory.map((item: any) => (
              <div
                key={item.id}
                className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <EditableField
                  label="Company"
                  value={item.company_name || ""}
                  compareValue={
                    originalWorkHistory?.find((o: any) => o.id === item.id)
                      ?.company_name || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onWorkHistoryChange(item.id, "company_name", next)
                  }
                  validator={(value) =>
                    value.trim() ? null : "Company required"
                  }
                  readOnly={readOnly}
                />
                <EditableField
                  label="Title"
                  value={item.job_title || ""}
                  compareValue={
                    originalWorkHistory?.find((o: any) => o.id === item.id)
                      ?.job_title || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onWorkHistoryChange(item.id, "job_title", next)
                  }
                  readOnly={readOnly}
                />
                <EditableField
                  label="Client"
                  value={item.client_name || ""}
                  compareValue={
                    originalWorkHistory?.find((o: any) => o.id === item.id)
                      ?.client_name || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onWorkHistoryChange(item.id, "client_name", next)
                  }
                  readOnly={readOnly}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <EditableField
                    label="Start date"
                    value={item.start_date || ""}
                    compareValue={
                      originalWorkHistory?.find((o: any) => o.id === item.id)
                        ?.start_date || ""
                    }
                    showComparison={compareMode}
                    confidence={null}
                    flagged={false}
                    onSave={(next) =>
                      onWorkHistoryChange(item.id, "start_date", next)
                    }
                    readOnly={readOnly}
                  />
                  <EditableField
                    label="End date"
                    value={item.end_date || ""}
                    compareValue={
                      originalWorkHistory?.find((o: any) => o.id === item.id)
                        ?.end_date || ""
                    }
                    showComparison={compareMode}
                    confidence={null}
                    flagged={false}
                    onSave={(next) =>
                      onWorkHistoryChange(item.id, "end_date", next)
                    }
                    readOnly={readOnly}
                  />
                </div>
                <EditableField
                  label="Location"
                  value={item.location || ""}
                  compareValue={
                    originalWorkHistory?.find((o: any) => o.id === item.id)
                      ?.location || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onWorkHistoryChange(item.id, "location", next)
                  }
                  readOnly={readOnly}
                />
                <EditableField
                  label="Description"
                  value={item.description || ""}
                  compareValue={
                    originalWorkHistory?.find((o: any) => o.id === item.id)
                      ?.description || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onWorkHistoryChange(item.id, "description", next)
                  }
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Skills</h4>
          <div className="mt-3 space-y-2">
            {skills.map((item: any, index: number) => (
              <EditableField
                key={`skill-${index}`}
                label={`Skill ${index + 1}`}
                value={item.name || ""}
                compareValue={originalSkills?.[index]?.name || ""}
                showComparison={compareMode}
                confidence={item.confidence}
                flagged={false}
                onSave={(next) => onFieldChange(`skills.${index}.name`, next)}
                readOnly={readOnly}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Education</h4>
          <div className="mt-3 space-y-2">
            {education.map((item: any, index: number) => (
              <div
                key={`education-${index}`}
                className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <EditableField
                  label="Institution"
                  value={item.institution || ""}
                  compareValue={originalEducation?.[index]?.institution || ""}
                  showComparison={compareMode}
                  confidence={item.confidence}
                  flagged={false}
                  onSave={(next) =>
                    onFieldChange(`education.${index}.institution`, next)
                  }
                  readOnly={readOnly}
                />
                <EditableField
                  label="Degree"
                  value={item.degree || ""}
                  compareValue={originalEducation?.[index]?.degree || ""}
                  showComparison={compareMode}
                  confidence={item.confidence}
                  flagged={false}
                  onSave={(next) =>
                    onFieldChange(`education.${index}.degree`, next)
                  }
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Certifications
          </h4>
          <div className="mt-3 space-y-2">
            {certifications.map((item: any) => (
              <div
                key={item.id}
                className="space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <EditableField
                  label="Certification"
                  value={item.name || ""}
                  compareValue={
                    originalCertifications?.find((o: any) => o.id === item.id)
                      ?.name || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onCertificationChange(item.id, "name", next)
                  }
                  validator={(value) => (value.trim() ? null : "Name required")}
                  readOnly={readOnly}
                />
                <EditableField
                  label="Issuer"
                  value={item.issuing_organization || ""}
                  compareValue={
                    originalCertifications?.find((o: any) => o.id === item.id)
                      ?.issuing_organization || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onCertificationChange(item.id, "issuing_organization", next)
                  }
                  readOnly={readOnly}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <EditableField
                    label="Issue date"
                    value={item.issue_date || ""}
                    compareValue={
                      originalCertifications?.find((o: any) => o.id === item.id)
                        ?.issue_date || ""
                    }
                    showComparison={compareMode}
                    confidence={null}
                    flagged={false}
                    onSave={(next) =>
                      onCertificationChange(item.id, "issue_date", next)
                    }
                    readOnly={readOnly}
                  />
                  <EditableField
                    label="Expiry date"
                    value={item.expiry_date || ""}
                    compareValue={
                      originalCertifications?.find((o: any) => o.id === item.id)
                        ?.expiry_date || ""
                    }
                    showComparison={compareMode}
                    confidence={null}
                    flagged={false}
                    onSave={(next) =>
                      onCertificationChange(item.id, "expiry_date", next)
                    }
                    readOnly={readOnly}
                  />
                </div>
                <EditableField
                  label="Credential ID"
                  value={item.credential_id || ""}
                  compareValue={
                    originalCertifications?.find((o: any) => o.id === item.id)
                      ?.credential_id || ""
                  }
                  showComparison={compareMode}
                  confidence={null}
                  flagged={false}
                  onSave={(next) =>
                    onCertificationChange(item.id, "credential_id", next)
                  }
                  readOnly={readOnly}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">
            Confidence summary
          </h4>
          <div className="mt-2 text-xs text-slate-500">
            {Object.entries(flaggedFields).map(([field, value]) => (
              <div
                key={field}
                className="flex items-center justify-between py-1"
              >
                <span>{field}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${confidenceTone(value)}`}
                >
                  {confidenceLabel(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
