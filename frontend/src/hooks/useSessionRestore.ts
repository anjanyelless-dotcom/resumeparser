import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useApplicationContext } from "../features/apply/context/ApplicationContext";
import { getCandidateByEmail } from "../services/api/candidates";
import { loadApplicationProgress } from "../services/api/applications";
import toast from "react-hot-toast";

export const useSessionRestore = () => {
  const { user, token, isAuthenticated, setLoading } = useAuthStore();
  const { setApplicationWithoutAutoSave, setCurrentStep } = useApplicationContext();
  const [isRestoring, setIsRestoring] = useState(false);
  const hasRestored = useRef(false);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const restoreSession = async () => {
      if (!token || !user || !isAuthenticated || hasRestored.current || isRestoringRef.current) {
        return;
      }

      isRestoringRef.current = true;
      setIsRestoring(true);
      setLoading(true);

      try {
        console.log("Restoring session for user:", user?.email);

        // Step 1: Fetch candidate profile
        const candidate = await getCandidateByEmail(user?.email || "");
        
        if (candidate) {
          console.log("Found candidate profile:", candidate.id);

          // Step 2: Load application progress if exists
          const applicationProgress = await loadApplicationProgress(candidate.id);
          
          if (applicationProgress) {
            console.log("Found application progress, restoring...");
            
            // Restore application data (skip auto-save to prevent loops)
            setApplicationWithoutAutoSave(applicationProgress);
            
            // Determine which step to show based on completion
            if (applicationProgress.resume?.uploadStatus === "parsed") {
              // Resume is uploaded and parsed, go to information step
              setCurrentStep("information");
              toast.success("Welcome back! Your application progress has been restored.");
            } else if (applicationProgress.account?.email) {
              // Account is created but no resume, go to resume step
              setCurrentStep("resume");
              toast.success("Welcome back! Please upload your resume to continue.");
            } else {
              // Start from beginning
              setCurrentStep("account");
              toast.success("Welcome back! Please complete your application.");
            }
          } else {
            console.log("No application progress found, deriving step from candidate profile");
            // No saved progress but candidate exists; infer where to resume
            const hasResume = candidate.file_path || candidate.raw_resume_text || candidate.parsing_status?.status === "completed";
            if (hasResume) {
              setCurrentStep("information");
              toast.success("Welcome back! Please review your information.");
            } else if (candidate.email || user?.email) {
              setCurrentStep("resume");
              toast.success("Welcome back! Please upload your resume to continue.");
            } else {
              setCurrentStep("account");
              toast.success("Welcome back! Please complete your application.");
            }
          }
        } else {
          console.log("No candidate profile found, starting fresh");
          setCurrentStep("account");
          toast.success("Welcome! Please complete your application.");
        }
      } catch (error: any) {
        console.error("Error restoring session:", error);
        toast.error("Error loading your data. Please start over.");
        setCurrentStep("account");
      } finally {
        isRestoringRef.current = false;
        setIsRestoring(false);
        setLoading(false);
        hasRestored.current = true;
      }
    };

    restoreSession();
  }, [token, user, isAuthenticated, setApplicationWithoutAutoSave, setCurrentStep, setLoading]);

  return { isRestoring };
};
