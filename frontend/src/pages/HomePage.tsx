import { ArrowRight, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="space-y-5">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI-ready resume insights
          </p>
          <h1 className="text-balance text-4xl font-semibold text-slate-900 md:text-5xl">
            Streamline candidate intake with a secure resume parsing pipeline.
          </h1>
          <p className="text-base leading-relaxed text-slate-600">
            Upload resumes, parse structured data, and keep every candidate
            profile organized in one modern workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              icon={<UploadCloud className="h-4 w-4" />}
              onClick={() => navigate("/upload")}
            >
              Upload a Resume
            </Button>
            <Button
              variant="secondary"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate("/candidates")}
            >
              View Candidates
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-brand-50 p-6 shadow-subtle">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Processed
                </p>
                <p className="text-2xl font-semibold text-slate-900">1,284</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-brand-600" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">Accuracy</p>
              <p className="text-2xl font-semibold text-slate-900">96%</p>
              <p className="mt-2 text-sm text-slate-600">
                Configurable extraction rules ensure high confidence results.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-slate-500">
                Integrations
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Connect ATS, HRIS, and analytics workflows in minutes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Secure storage",
            description:
              "Encrypted file handling, access controls, and audit-ready logs.",
          },
          {
            title: "Structured profiles",
            description:
              "Normalize work history, education, and skills into clean records.",
          },
          {
            title: "Operational insights",
            description:
              "Monitor parsing status and confidence across every upload.",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle"
          >
            <h3 className="text-base font-semibold text-slate-900">
              {card.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
