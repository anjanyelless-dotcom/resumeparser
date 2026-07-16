import { useCallback, useRef } from "react";
import { useScrollToField } from "../../hooks/useScrollToField";
import { Award, Briefcase, GraduationCap, Sparkles } from "lucide-react";
import type {
  Candidate,
  WorkHistory,
  Education,
  Skill,
  Certification,
} from "../../types";
import PersonalDetailsSection from "./PersonalDetailsSection";
import SummarySection from "./SummarySection";
import WorkHistoryTimeline from "./WorkHistoryTimeline";
import EducationSection from "./EducationSection";
import SkillsSection from "./SkillsSection";
import CertificationsSection from "./CertificationsSection";

export type FieldId = string;

type StructuredDataPanelProps = {
  candidate: Candidate;
  displayWorkHistory: WorkHistory[];
  displayEducation: Education[];
  displayCertifications: Certification[];
  displaySkills: Skill[];
  displayCandidateSkills: { skill?: Skill | null }[];
  displaySummary: string | null;
  activeFieldId: FieldId | null;
  onFieldSelect: (fieldId: FieldId) => void;
  panelScrollToFieldId?: FieldId | null;
  onPanelScrollComplete?: () => void;
  autoEditFieldId?: FieldId | null;
  onAutoEditConsumed?: () => void;
  onCandidateUpdate: (c: Candidate) => void;
  onWorkHistoryUpdate: (items: WorkHistory[]) => void;
  onEducationUpdate: (items: Education[]) => void;
  onSkillsUpdate: (skills: Skill[]) => void;
  onSummarySave: (value: string) => void;
  readOnly?: boolean;
  candidateId: string;
  showMismatchBanner?: boolean;
};

export default function StructuredDataPanel({
  candidate,
  displayWorkHistory,
  displayEducation,
  displayCertifications,
  displaySkills,
  displayCandidateSkills,
  displaySummary,
  activeFieldId,
  onFieldSelect,
  panelScrollToFieldId = null,
  onPanelScrollComplete,
  autoEditFieldId = null,
  onAutoEditConsumed,
  onCandidateUpdate,
  onWorkHistoryUpdate,
  onEducationUpdate,
  onSkillsUpdate,
  onSummarySave,
  readOnly = false,
  candidateId,
  showMismatchBanner = false,
}: StructuredDataPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const skillsSectionRef = useRef<HTMLElement>(null);
  const experienceSectionRef = useRef<HTMLElement>(null);
  const educationSectionRef = useRef<HTMLElement>(null);
  const summarySectionRef = useRef<HTMLElement>(null);
  const certificationsSectionRef = useRef<HTMLDivElement | null>(null);

  const getPanelSectionElement = useCallback((fieldId: string) => {
    const refMap: Record<string, HTMLElement | null> = {
      skills: skillsSectionRef.current,
      experience: experienceSectionRef.current,
      education: educationSectionRef.current,
      summary: summarySectionRef.current,
    };
    return refMap[fieldId] ?? null;
  }, []);

  useScrollToField(
    panelScrollToFieldId,
    getPanelSectionElement,
    onPanelScrollComplete,
  );

  return (
    <div ref={panelRef} className="flex h-full flex-col gap-6 overflow-auto">
      {/* Personal Details */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Briefcase className="h-4 w-4 text-slate-500" />
          Personal Details
        </h3>
        <PersonalDetailsSection
          candidate={candidate}
          onUpdate={onCandidateUpdate}
          readOnly={readOnly}
          activeFieldId={activeFieldId}
          onFieldSelect={onFieldSelect}
          panelScrollToFieldId={panelScrollToFieldId}
          onPanelScrollComplete={onPanelScrollComplete}
          autoEditFieldId={autoEditFieldId}
          onAutoEditConsumed={onAutoEditConsumed}
        />
      </section>

      {/* Summary */}
      <section
        ref={summarySectionRef}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-slate-500" />
          Summary
        </h3>
        {showMismatchBanner && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ⚠️ Work history was parsed but not saved. Try re-processing.
          </div>
        )}
        <SummarySection
          summary={displaySummary}
          onSave={onSummarySave}
          readOnly={readOnly}
          activeFieldId={activeFieldId}
          onFieldSelect={onFieldSelect}
        />
      </section>

      {/* Experience */}
      <section
        ref={experienceSectionRef}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Briefcase className="h-4 w-4 text-slate-500" />
          Experience
        </h3>
        <WorkHistoryTimeline
          candidateId={candidateId}
          items={displayWorkHistory}
          onUpdate={onWorkHistoryUpdate}
          readOnly={readOnly}
          activeFieldId={activeFieldId}
          onFieldSelect={onFieldSelect}
        />
      </section>

      {/* Education */}
      <section
        ref={educationSectionRef}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <GraduationCap className="h-4 w-4 text-slate-500" />
          Education
        </h3>
        <EducationSection
          candidateId={candidateId}
          items={displayEducation}
          onUpdate={onEducationUpdate}
          readOnly={readOnly}
          activeFieldId={activeFieldId}
          onFieldSelect={onFieldSelect}
        />
      </section>

      {/* Certifications */}
      <section
        ref={certificationsSectionRef}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Award className="h-4 w-4 text-slate-500" />
          Certifications
        </h3>
        <CertificationsSection
          candidateId={candidateId}
          items={displayCertifications}
          onUpdate={(updated) => {
            onCandidateUpdate({
              ...candidate,
              certifications: updated,
            });
          }}
          readOnly={readOnly}
        />
      </section>

      {/* Skills */}
      <section
        ref={skillsSectionRef}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-slate-500" />
          Skills
        </h3>
        <SkillsSection
          skills={displaySkills}
          candidateSkills={displayCandidateSkills}
          onUpdate={onSkillsUpdate}
          activeFieldId={activeFieldId}
          onFieldSelect={onFieldSelect}
        />
      </section>
    </div>
  );
}
