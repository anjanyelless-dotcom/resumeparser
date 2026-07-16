import { useEffect, useState } from "react";
import { Badge, Loader2, PencilLine } from "lucide-react";
import toast from "react-hot-toast";

import { WIZARD_STEPS, useApplicationContext } from "../context/ApplicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import Button from "../../../components/common/Button";
import { submitApplication, updateCandidateProfile, createCandidateFromApplication } from "../../../services/api/applications";
import { getDefaultJobId } from "../../../services/api/jobs";
import { useAuthStore } from "../../../store/useAuthStore";


const stepTargetMap = {
  account: "account",
  resume: "resume",
  personal: "information",
  experience: "experience",
  questions: "questions",
  disclosures: "disclosures",
} as const;

export function ReviewPage() {
  const { application, prevStep, setCurrentStep, resetApplication, clearDraft } = useApplicationContext();
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    const loadJobId = async () => {
      const defaultJobId = await getDefaultJobId();
      setJobId(defaultJobId);
    };
    loadJobId();
  }, []);

  const summaryCards = [
    {
      key: "account",
      title: "Account",
      editStep: stepTargetMap.account,
      content: <p className="text-sm text-slate-600">{application.account.email}</p>,
    },
    {
      key: "resume",
      title: "Resume",
      editStep: stepTargetMap.resume,
      content: (
        <p className="text-sm text-slate-600">
          {application.resume.fileName} ({application.resume.fileSizeKb} KB)
        </p>
      ),
    },
    {
      key: "personal",
      title: "Personal Information",
      editStep: stepTargetMap.personal,
      content: (
        <div className="space-y-1 text-sm text-slate-600">
          <p>
            {application.personalInfo.firstName} {application.personalInfo.middleName} {application.personalInfo.lastName}
          </p>
          <p>{application.personalInfo.email}</p>
          <p>
            {application.personalInfo.countryCode} {application.personalInfo.mobile}
          </p>
          <p>
            {application.personalInfo.city}, {application.personalInfo.state}, {application.personalInfo.country}
          </p>
        </div>
      ),
    },
    {
      key: "experience",
      title: "Experience",
      editStep: stepTargetMap.experience,
      content: (
        <div className="space-y-2">
          {application.experiences.map((experience) => (
            <p key={experience.id} className="text-sm text-slate-600">
              {experience.jobTitle} - {experience.company}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: "education",
      title: "Education",
      editStep: stepTargetMap.experience,
      content: (
        <div className="space-y-2">
          {application.education.map((education) => (
            <p key={education.id} className="text-sm text-slate-600">
              {education.degree} - {education.institution}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: "certifications",
      title: "Certifications",
      editStep: stepTargetMap.experience,
      content: (
        <div className="space-y-2">
          {application.certifications.map((certification) => (
            <p key={certification.id} className="text-sm text-slate-600">
              {certification.certificationName} - {certification.organization}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: "projects",
      title: "Projects",
      editStep: stepTargetMap.experience,
      content: (
        <div className="space-y-2">
          {application.projects.map((project) => (
            <p key={project.id} className="text-sm text-slate-600">
              {project.projectName} - {project.role}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: "languages",
      title: "Languages",
      editStep: stepTargetMap.experience,
      content: (
        <div className="space-y-2">
          {application.languages.map((language) => (
            <p key={language.id} className="text-sm text-slate-600">
              {language.language} - {language.proficiency}
            </p>
          ))}
        </div>
      ),
    },
    {
      key: "skills",
      title: "Skills",
      editStep: stepTargetMap.experience,
      content: (
        <div className="flex flex-wrap gap-2">
          {application.skills.map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: "questions",
      title: "Application Questions",
      editStep: stepTargetMap.questions,
      content: <p className="text-sm text-slate-600">Notice period: {application.questions.noticePeriod || "N/A"}</p>,
    },
    {
      key: "disclosures",
      title: "Disclosures",
      editStep: stepTargetMap.disclosures,
      content: <p className="text-sm text-slate-600">Gender: {application.disclosures.gender}</p>,
    },
  ] as const;

  const handleSubmit = async () => {
    const { user } = useAuthStore.getState();
    
    if (!user) {
      toast.error("Please log in to submit your application");
      return;
    }

    if (!jobId) {
      toast.error("No available job posting. Please try again later.");
      return;
    }

    try {
      setSubmitting(true);

      // Step 1: Create or update candidate profile
      let candidateId = application.resume.candidateId;
      
      if (!candidateId) {
        // Create new candidate from application data
        const candidateData = {
          email: application.personalInfo.email,
          full_name: `${application.personalInfo.firstName} ${application.personalInfo.lastName}`.trim(),
          phone: application.personalInfo.phone,
          location: `${application.personalInfo.city}, ${application.personalInfo.state}`,
          linkedin_url: application.personalInfo.linkedIn,
          github_url: application.personalInfo.github,
          summary: application.questions?.reasonForJobChange,
          // Work experience
          work_history: application.experiences?.map(exp => ({
            company_name: exp.company,
            job_title: exp.jobTitle,
            start_date: exp.startYear ? `${exp.startMonth} ${exp.startYear}` : null,
            end_date: !exp.currentlyWorking && exp.endYear ? `${exp.endMonth} ${exp.endYear}` : null,
            is_current: exp.currentlyWorking,
            location: exp.location,
            description: exp.roleDescription,
          })) || [],
          // Education
          education: application.education?.map(edu => ({
            institution: edu.institution,
            degree: edu.degree,
            field_of_study: edu.fieldOfStudy,
            start_date: edu.startYear,
            end_date: edu.endYear,
            gpa: parseFloat(edu.cgpa) || null,
          })) || [],
          // Skills
          skills: application.skills || [],
          // Resume file info
          resume_file_path: application.resume.fileName,
          original_filename: application.resume.fileName,
        };

        const candidateResponse = await createCandidateFromApplication(candidateData);
        candidateId = candidateResponse?.id;
        
        if (!candidateId) {
          throw new Error("Failed to create candidate profile");
        }
      } else {
        // Update existing candidate
        const updateData = {
          full_name: `${application.personalInfo.firstName} ${application.personalInfo.lastName}`.trim(),
          phone: application.personalInfo.phone,
          location: `${application.personalInfo.city}, ${application.personalInfo.state}`,
          linkedin_url: application.personalInfo.linkedIn,
          github_url: application.personalInfo.github,
          summary: application.questions?.reasonForJobChange,
        };

        await updateCandidateProfile(candidateId, updateData);
      }

      // Step 2: Submit application (for now using a default job ID)
      // In production, this would come from the job posting the user is applying to
      const applicationSubmission = {
        candidateId,
        jobId,
        resumeId: application.resume.parsingJobId,
        personalInfo: application.personalInfo,
        experiences: application.experiences,
        education: application.education,
        skills: application.skills,
        certifications: application.certifications,
        projects: application.projects,
        questions: application.questions,
        disclosures: application.disclosures,
      };

      await submitApplication(applicationSubmission);

      // Step 3: Clean up and show success
      clearDraft();
      toast.success("Application submitted successfully! We'll be in touch soon.");
      resetApplication();

      // Optionally redirect to a success page
      // window.location.href = '/application-success';

    } catch (error: any) {
      console.error("Application submission error:", error);
      toast.error(error.response?.data?.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    } 
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle">
        <h2 className="text-center text-4xl font-semibold text-slate-800">Review</h2>
        <p className="mt-1 text-sm text-slate-600">
          Verify your details before submitting the final application payload.
        </p>
      </div>

      {summaryCards.map((card) => (
        <Card key={card.key}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{card.title}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep(card.editStep)}
            >
              <PencilLine className="mr-1 h-4 w-4" /> Edit
            </Button>
          </CardHeader>
          <CardContent>{card.content}</CardContent>
        </Card>
      ))}

      <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-2 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl justify-end gap-3">
          <Button variant="secondary" onClick={prevStep}>Back</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Application"
            )}
          </Button>
        </div>
      </div>

      <p className="sr-only">{WIZARD_STEPS.length}</p>
    </div>
  );
}