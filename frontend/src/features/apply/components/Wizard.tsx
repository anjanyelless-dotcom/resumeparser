import { useEffect } from "react";
import { CreateAccountForm } from "./CreateAccountForm";
import { ResumeUploader } from "./ResumeUploader";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { ExperienceForm } from "./ExperienceForm";

import { DisclosureForm } from "./DisclosureForm";
import { ReviewPage } from "./ReviewPage";
import { Layout } from "./Layout";
import { useApplicationContext } from "../context/ApplicationContext";
import { ApplicationQuestions } from "./ApplicationQuestions";

export function Wizard() {
  const { currentStep, loadDraft, saveDraft } = useApplicationContext();

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    saveDraft();
  }, [saveDraft, currentStep]);

  return (
    <Layout>
      {currentStep === "account" && <CreateAccountForm />}
      {currentStep === "resume" && <ResumeUploader />}
      {currentStep === "information" && <PersonalInfoForm />}
      {currentStep === "experience" && <ExperienceForm />}
      {currentStep === "questions" && <ApplicationQuestions />}
      {currentStep === "disclosures" && <DisclosureForm />}
      {currentStep === "review" && <ReviewPage />}
    </Layout>
  );
}