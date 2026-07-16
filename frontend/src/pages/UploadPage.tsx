import { useState, useCallback, useEffect } from "react";
import { Briefcase, Calendar, XCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import {
  connectSocket,
  subscribeToParsingProgress,
  subscribeToParsingComplete,
  subscribeToParsingFailed,
} from "../services/socket";
import toast from "react-hot-toast";
import { api } from "../services/api";
import ParsedDataDebugView from "../components/upload/ParsedDataDebugView";
import SpeedGauge from "../components/upload/SpeedGauge";
import ParsedResultCard from "../components/upload/ParsedResultCard";
import ModelResultsView from "../components/upload/ModelResultsView";
import { parseToDateInput } from "../utils/date";
import { validateEmail } from "../utils/validation";
import DuplicateCandidateModal from "../components/upload/DuplicateCandidateModal";
import { calculateTotalExperience } from "../utils/experienceCalculator";
import BulkUploadSummary from "../components/upload/BulkUploadSummary";
import { useUploadStore } from "../store/uploadStore";

interface LLMModel {
  id: string;
  name: string;
  badge: string;
  inputPrice: string;
  outputPrice: string;
}

interface UploadFile {
  file: File;
  id: string;
  status: "queued" | "pending" | "uploading" | "previewing" | "parsing" | "saving" | "completed" | "saved" | "success" | "error" | "failed" | "duplicate";
  progress: number;
  message: string;
  candidateId?: string;
  result?: any;
  error?: string;
  sections?: SectionData;
  duplicateError?: {
    message: string;
    field: string;
    existingCandidateId: string;
    existingCandidateName: string;
  } | null;
}

interface SectionData {
  experience?: {
    text: string;
    char_count: number;
  };
  education?: {
    text: string;
    char_count: number;
  };
  skills?: {
    text: string;
    char_count: number;
  };
  summary?: {
    text: string;
    char_count: number;
  };
  certifications?: {
    text: string;
    char_count: number;
  };
  projects?: {
    text: string;
    char_count: number;
  };
  contact?: {
    text: string;
    char_count: number;
  };
}

interface ParsedSectionsResponse {
  status: string;
  work_history?: Array<any>;
  work_experience?: Array<any>;
  education: Array<any>;
  skills: Array<string>;
  summary: string | null;
  certifications: Array<string>;
  projects: Array<string>;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
  };
  processing_time_ms: number;
  message: string;
}

const LLM_MODELS: LLMModel[] = [
  {
    id: "own-model",
    name: "Our Own Model",
    badge: "Default",
    inputPrice: "Free",
    outputPrice: "Free",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash-Lite",
    badge: "Cheapest",
    inputPrice: "$0.075",
    outputPrice: "$0.30",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3.2",
    badge: "Best value",
    inputPrice: "$0.14",
    outputPrice: "$0.28",
  },
  {
    id: "claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    badge: "Reliable",
    inputPrice: "$1.00",
    outputPrice: "$5.00",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    badge: "Fallback",
    inputPrice: "$0.15",
    outputPrice: "$0.60",
  },
];

// ATS Validation Utilities
export const validateJobTitle = (title: string): string | null => {
  if (!title || title.trim().length === 0) return "Job Title is required.";
  const trimmed = title.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return "Please enter a valid Job Title.";
  if (!/^[\w\s.\-&/()']+$/.test(trimmed)) return "Please enter a valid Job Title.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Please enter a valid Job Title.";
  return null;
};

export const validateCompanyName = (name: string): string | null => {
  if (!name || name.trim().length === 0) return "Company Name is required.";
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 150) return "Please enter a valid Company Name.";
  if (!/^[\w\s.,&'\-]+$/.test(trimmed)) return "Please enter a valid Company Name.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Please enter a valid Company Name.";
  return null;
};

export const validateLocation = (location: string): string | null => {
  if (!location || location.trim().length === 0) return "Location is required.";
  const trimmed = location.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return "Please enter a valid location.";
  if (!/^[A-Za-z\s,\-.]+$/.test(trimmed)) return "Please enter a valid location.";
  return null;
};

export const validateDegree = (degree: string): string | null => {
  if (!degree || degree.trim().length === 0) return "Degree is required.";
  const trimmed = degree.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return "Degree is required.";
  if (!/^[\w\s.\-&]+$/.test(trimmed)) return "Degree is required.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Degree is required.";
  return null;
};

export const validateInstitution = (inst: string): string | null => {
  if (!inst || inst.trim().length === 0) return "Institution Name is required.";
  const trimmed = inst.trim();
  if (trimmed.length < 2 || trimmed.length > 150) return "Institution Name is required.";
  if (!/^[\w\s.\-&,']+$/.test(trimmed)) return "Institution Name is required.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Institution Name is required.";
  return null;
};

export const validateFieldOfStudy = (field: string): string | null => {
  if (!field || field.trim().length === 0) return null;
  const trimmed = field.trim();
  if (trimmed.length > 100) return "Field of study is too long.";
  if (!/^[\w\s&/\-]+$/.test(trimmed)) return "Invalid characters in Field of Study.";
  if (/^[^a-zA-Z]+$/.test(trimmed)) return "Field of study must contain letters.";
  return null;
};

export const validateEduDate = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim().length === 0) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Please select a valid date.";
  return null;
};


export default function UploadPage() {
  const navigate = useNavigate();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isAIBulkMode, setIsAIBulkMode] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadFile | null>(null);
  const [viewingBulkFileId, setViewingBulkFileId] = useState<string | null>(null);
  const [selectedLLM, setSelectedLLM] = useState<string>("own-model");
  const [showLLMDropdown, setShowLLMDropdown] = useState(false);
  const [forceOcr, setForceOcr] = useState(false);
  const [extractedSections, setExtractedSections] = useState<SectionData | null>(null);
  const [isExtractingSections, setIsExtractingSections] = useState(false);
  const [parsedSections, setParsedSections] = useState<ParsedSectionsResponse | null>(null);
  const [isParsingModel, setIsParsingModel] = useState(false);
  const [isSavingCandidate, setIsSavingCandidate] = useState(false);
  const [parsedName, setParsedName] = useState("");
  const [parsedEmail, setParsedEmail] = useState("");
  const [parsedPhone, setParsedPhone] = useState("");
  const [parsedLinkedin, setParsedLinkedin] = useState("");
  const [parsedPortfolio, setParsedPortfolio] = useState("");
  const [rawResumeText, setRawResumeText] = useState(""); // Full raw text from preview-sections
  const [extractedSkillsFromText, setExtractedSkillsFromText] = useState<any>(null); // Skills extracted from resume text
  const [duplicateErrorModal, setDuplicateErrorModal] = useState<{ message: string; field: string; existingCandidateId: string; existingCandidateName: string } | null>(null);

  // Skills editing states
  const [newSkillText, setNewSkillText] = useState("");

  // Projects editing states
  const [editingProjectIdx, setEditingProjectIdx] = useState<number | null>(null);
  const [editProjectText, setEditProjectText] = useState("");
  const [newProjectText, setNewProjectText] = useState("");
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Certifications editing states
  const [editingCertIdx, setEditingCertIdx] = useState<number | null>(null);
  const [editCertText, setEditCertText] = useState("");
  const [newCertText, setNewCertText] = useState("");
  const [isAddingCert, setIsAddingCert] = useState(false);

  // Work Experience editing states
  const [editingWorkIdx, setEditingWorkIdx] = useState<number | null>(null);
  const [editWorkData, setEditWorkData] = useState<any>(null);
  const [isAddingWork, setIsAddingWork] = useState(false);
  const [newWorkData, setNewWorkData] = useState<any>({
    job_title: "",
    company_name: "",
    location: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: ""
  });

  // Education editing states
  const [editingEduIdx, setEditingEduIdx] = useState<number | null>(null);
  const [editEduData, setEditEduData] = useState<any>(null);
  const [isAddingEdu, setIsAddingEdu] = useState(false);

  // Bulk upload summary from store
  const { uploadComplete, summary, resetSummary, uploadAll, addFiles, queue, clearQueue } = useUploadStore();
  const [duplicateModal, setDuplicateModal] = useState<{
    fileName: string;
    message: string;
    field: string;
    existingCandidateId: string;
    existingCandidateName: string;
  } | null>(null);
  const [newEduData, setNewEduData] = useState<any>({
    degree: "",
    institution: "",
    field_of_study: "",
    start_year: "",
    end_year: ""
  });

  const isValidTextString = (str: string | undefined | null) => {
    if (!str) return false;
    const trimmed = str.trim();
    if (trimmed.length < 2) return false;
    if (/^[^a-zA-Z]+$/.test(trimmed)) return false;
    return true;
  };

  // Summary editing states
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState("");

  // Contact editing states
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [tempContact, setTempContact] = useState({ name: "", email: "", phone: "", linkedin: "", portfolio: "" });

  // Error states for inline validation
  const [contactErrors, setContactErrors] = useState<{ name?: string, email?: string, phone?: string, linkedin?: string, portfolio?: string }>({});
  const [workErrors, setWorkErrors] = useState<any>({});
  const [newWorkErrors, setNewWorkErrors] = useState<any>({});
  const [eduErrors, setEduErrors] = useState<any>({});
  const [newEduErrors, setNewEduErrors] = useState<any>({});
  const [skillError, setSkillError] = useState("");
  const [projectError, setProjectError] = useState("");
  const [newProjectError, setNewProjectError] = useState("");
  const [certError, setCertError] = useState("");
  const [newCertError, setNewCertError] = useState("");

  // Contact Handlers
  const handleStartEditContact = () => {
    setTempContact({ name: parsedName, email: parsedEmail, phone: parsedPhone, linkedin: parsedLinkedin, portfolio: parsedPortfolio });
    setContactErrors({});
    setIsEditingContact(true);
  };



  const validatePhone = (val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    if (!/^\+?\d+$/.test(trimmed)) return "Please enter a valid Phone Number.";
    const digitCount = trimmed.replace(/\D/g, "").length;
    if (digitCount < 7 || digitCount > 15) return "Please enter a valid Phone Number.";
    return undefined;
  };

  const handleSaveContact = () => {
    const errors: { name?: string, email?: string, phone?: string } = {};
    if (!isValidTextString(tempContact.name)) {
      errors.name = "Candidate Name is required (min 2 chars, no pure special chars)";
    }
    const emailErr = validateEmail(tempContact.email);
    if (emailErr) errors.email = emailErr;

    const phoneErr = validatePhone(tempContact.phone);
    if (phoneErr) errors.phone = phoneErr;

    if (Object.keys(errors).length > 0) {
      setContactErrors(errors);
      return;
    }

    setContactErrors({});
    setParsedName(tempContact.name);
    setParsedEmail(tempContact.email);
    setParsedPhone(tempContact.phone);
    setParsedLinkedin(tempContact.linkedin || "");
    setParsedPortfolio(tempContact.portfolio || "");
    setIsEditingContact(false);
  };

  const handleDeleteContact = () => {
    setParsedName("");
    setParsedEmail("");
    setParsedPhone("");
    setParsedLinkedin("");
    setParsedPortfolio("");
    setContactErrors({});
    setIsEditingContact(false);
  };

  // Summary Handlers
  const handleStartEditSummary = () => {
    if (parsedSections) {
      setEditSummaryText(parsedSections.summary || "");
      setIsEditingSummary(true);
    }
  };

  const handleSaveSummary = () => {
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        summary: editSummaryText
      });
      setIsEditingSummary(false);
    }
  };

  const handleDeleteSummary = () => {
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        summary: ""
      });
      setIsEditingSummary(false);
    }
  };

  // Work Experience Handlers
  const handleStartEditWork = (idx: number, data: any) => {
    setEditingWorkIdx(idx);
    setEditWorkData({ ...data });
    setWorkErrors({});
  };

  const handleSaveWork = (idx: number) => {
    const errors: any = {};

    const titleErr = validateJobTitle(editWorkData.job_title);
    if (titleErr) errors.job_title = titleErr;

    const companyErr = validateCompanyName(editWorkData.company_name);
    if (companyErr) errors.company_name = companyErr;

    const locErr = validateLocation(editWorkData.location);
    if (locErr) errors.location = locErr;

    if (!editWorkData.start_date) {
      errors.start_date = "Start Date is required.";
    } else {
      const sDate = new Date(editWorkData.start_date);
      if (sDate > new Date()) errors.start_date = "Start Date cannot be a future date.";
      if (!editWorkData.is_current && editWorkData.end_date) {
        const eDate = new Date(editWorkData.end_date);
        if (sDate > eDate) errors.end_date = "Start Date must be before End Date.";
      }
    }

    if (!editWorkData.is_current && !editWorkData.end_date) {
      errors.end_date = "End Date is required.";
    }

    if (parsedSections) {
      const isDuplicate = (parsedSections.work_experience || []).some((exp, i) =>
        i !== idx &&
        exp.job_title?.trim() === editWorkData.job_title?.trim() &&
        exp.company_name?.trim() === editWorkData.company_name?.trim() &&
        exp.start_date === editWorkData.start_date
      );
      if (isDuplicate) errors.duplicate = "This work experience already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setWorkErrors(errors);
      return;
    }

    setWorkErrors({});
    if (parsedSections) {
      const updated = [...(parsedSections.work_experience || [])];
      updated[idx] = editWorkData;
      setParsedSections({
        ...parsedSections,
        work_experience: updated
      });
      setEditingWorkIdx(null);
      setEditWorkData(null);
    }
  };

  const handleDeleteWork = (idx: number) => {
    if (parsedSections) {
      const updated = (parsedSections.work_experience || []).filter((_, i) => i !== idx);
      setParsedSections({
        ...parsedSections,
        work_experience: updated
      });
    }
  };

  const handleAddWork = () => {
    const errors: any = {};

    const titleErr = validateJobTitle(newWorkData.job_title);
    if (titleErr) errors.job_title = titleErr;

    const companyErr = validateCompanyName(newWorkData.company_name);
    if (companyErr) errors.company_name = companyErr;

    const locErr = validateLocation(newWorkData.location);
    if (locErr) errors.location = locErr;

    if (!newWorkData.start_date) {
      errors.start_date = "Start Date is required.";
    } else {
      const sDate = new Date(newWorkData.start_date);
      if (sDate > new Date()) errors.start_date = "Start Date cannot be a future date.";
      if (!newWorkData.is_current && newWorkData.end_date) {
        const eDate = new Date(newWorkData.end_date);
        if (sDate > eDate) errors.end_date = "Start Date must be before End Date.";
      }
    }

    if (!newWorkData.is_current && !newWorkData.end_date) {
      errors.end_date = "End Date is required.";
    }

    if (parsedSections) {
      const isDuplicate = (parsedSections.work_experience || []).some((exp) =>
        exp.job_title?.trim() === newWorkData.job_title?.trim() &&
        exp.company_name?.trim() === newWorkData.company_name?.trim() &&
        exp.start_date === newWorkData.start_date
      );
      if (isDuplicate) errors.duplicate = "This work experience already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setNewWorkErrors(errors);
      return;
    }

    setNewWorkErrors({});
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        work_experience: [...(parsedSections.work_experience || []), newWorkData]
      });
      setIsAddingWork(false);
      setNewWorkData({
        job_title: "",
        company_name: "",
        location: "",
        start_date: "",
        end_date: "",
        is_current: false,
        description: ""
      });
    }
  };

  // Education Handlers
  const handleStartEditEdu = (idx: number, data: any) => {
    setEditingEduIdx(idx);
    setEditEduData({ ...data });
    setEduErrors({});
  };

  const handleSaveEdu = (idx: number) => {
    const errors: any = {};

    const degErr = validateDegree(editEduData.degree);
    if (degErr) errors.degree = degErr;

    const instErr = validateInstitution(editEduData.institution);
    if (instErr) errors.institution = instErr;

    const fieldErr = validateFieldOfStudy(editEduData.field_of_study);
    if (fieldErr) errors.field_of_study = fieldErr;

    const startErr = validateEduDate(editEduData.start_year);
    if (startErr) errors.start_year = startErr;

    const endErr = validateEduDate(editEduData.end_year);
    if (endErr) errors.end_year = endErr;

    if (parsedSections) {
      const isDuplicate = parsedSections.education.some((edu, i) =>
        i !== idx &&
        edu.degree?.trim() === editEduData.degree?.trim() &&
        edu.institution?.trim() === editEduData.institution?.trim() &&
        edu.end_year === editEduData.end_year &&
        edu.start_year === editEduData.start_year
      );
      if (isDuplicate) errors.duplicate = "This education record already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setEduErrors(errors);
      return;
    }

    setEduErrors({});
    if (parsedSections) {
      const updated = [...parsedSections.education];
      updated[idx] = editEduData;
      setParsedSections({
        ...parsedSections,
        education: updated
      });
      setEditingEduIdx(null);
      setEditEduData(null);
    }
  };

  const handleDeleteEdu = (idx: number) => {
    if (parsedSections) {
      const updated = parsedSections.education.filter((_, i) => i !== idx);
      setParsedSections({
        ...parsedSections,
        education: updated
      });
    }
  };

  const handleAddEdu = () => {
    const errors: any = {};

    const degErr = validateDegree(newEduData.degree);
    if (degErr) errors.degree = degErr;

    const instErr = validateInstitution(newEduData.institution);
    if (instErr) errors.institution = instErr;

    const fieldErr = validateFieldOfStudy(newEduData.field_of_study);
    if (fieldErr) errors.field_of_study = fieldErr;

    const startErr = validateEduDate(newEduData.start_year);
    if (startErr) errors.start_year = startErr;

    const endErr = validateEduDate(newEduData.end_year);
    if (endErr) errors.end_year = endErr;

    if (parsedSections) {
      const isDuplicate = parsedSections.education.some((edu) =>
        edu.degree?.trim() === newEduData.degree?.trim() &&
        edu.institution?.trim() === newEduData.institution?.trim() &&
        edu.end_year === newEduData.end_year &&
        edu.start_year === newEduData.start_year
      );
      if (isDuplicate) errors.duplicate = "This education record already exists.";
    }

    if (Object.keys(errors).length > 0) {
      setNewEduErrors(errors);
      return;
    }

    setNewEduErrors({});
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        education: [...parsedSections.education, newEduData]
      });
      setIsAddingEdu(false);
      setNewEduData({
        degree: "",
        institution: "",
        field_of_study: "",
        start_year: "",
        end_year: ""
      });
    }
  };

  // Skills Handlers
  const handleDeleteSkill = (idx: number) => {
    if (parsedSections) {
      const updated = parsedSections.skills.filter((_, i) => i !== idx);
      setParsedSections({
        ...parsedSections,
        skills: updated
      });
    }
  };

  const handleAddSkill = () => {
    if (!isValidTextString(newSkillText)) {
      setSkillError("Skill is required (min 2 chars, no pure special chars)");
      return;
    }
    setSkillError("");
    if (parsedSections) {
      if (!parsedSections.skills.includes(newSkillText.trim())) {
        setParsedSections({
          ...parsedSections,
          skills: [...parsedSections.skills, newSkillText.trim()]
        });
      }
      setNewSkillText("");
    }
  };

  // Projects Handlers
  const handleStartEditProject = (idx: number, text: string) => {
    setEditingProjectIdx(idx);
    setEditProjectText(text);
    setProjectError("");
  };

  const handleSaveProject = (idx: number) => {
    if (!isValidTextString(editProjectText)) {
      setProjectError("Project description is required (min 2 chars)");
      return;
    }
    setProjectError("");
    if (parsedSections) {
      const updated = [...parsedSections.projects];
      updated[idx] = editProjectText;
      setParsedSections({
        ...parsedSections,
        projects: updated
      });
      setEditingProjectIdx(null);
      setEditProjectText("");
    }
  };

  const handleDeleteProject = (idx: number) => {
    if (parsedSections) {
      const updated = parsedSections.projects.filter((_, i) => i !== idx);
      setParsedSections({
        ...parsedSections,
        projects: updated
      });
    }
  };

  const handleAddProject = () => {
    if (!isValidTextString(newProjectText)) {
      setNewProjectError("Project description is required (min 2 chars)");
      return;
    }
    setNewProjectError("");
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        projects: [...parsedSections.projects, newProjectText.trim()]
      });
      setIsAddingProject(false);
      setNewProjectText("");
    }
  };

  // Certifications Handlers
  const handleStartEditCert = (idx: number, text: string) => {
    setEditingCertIdx(idx);
    setEditCertText(text);
    setCertError("");
  };

  const handleSaveCert = (idx: number) => {
    if (!isValidTextString(editCertText)) {
      setCertError("Certification name is required (min 2 chars)");
      return;
    }
    setCertError("");
    if (parsedSections) {
      const updated = [...parsedSections.certifications];
      updated[idx] = editCertText;
      setParsedSections({
        ...parsedSections,
        certifications: updated
      });
      setEditingCertIdx(null);
      setEditCertText("");
    }
  };

  const handleDeleteCert = (idx: number) => {
    if (parsedSections) {
      const updated = parsedSections.certifications.filter((_, i) => i !== idx);
      setParsedSections({
        ...parsedSections,
        certifications: updated
      });
    }
  };

  const handleAddCert = () => {
    if (!isValidTextString(newCertText)) {
      setNewCertError("Certification name is required (min 2 chars)");
      return;
    }
    setNewCertError("");
    if (parsedSections) {
      setParsedSections({
        ...parsedSections,
        certifications: [...parsedSections.certifications, newCertText.trim()]
      });
      setIsAddingCert(false);
      setNewCertText("");
    }
  };

  useEffect(() => {
    if (parsedSections) {
      setParsedName(parsedSections.contact?.name || "");
      setParsedEmail(parsedSections.contact?.email || "");
      setParsedPhone(parsedSections.contact?.phone || "");
      setParsedLinkedin(parsedSections.contact?.linkedin || "");
      setParsedPortfolio(
        (parsedSections.contact as any)?.portfolio_url ||
        (parsedSections.contact as any)?.portfolio ||
        (parsedSections.contact as any)?.website || ""
      );
    }
  }, [parsedSections]);

  // Socket.io connection
  useEffect(() => {
    connectSocket();

    // Subscribe to parsing events
    const handleProgress = (data: {
      candidateId: string;
      progress: number;
      message: string;
    }) => {
      setUploadFiles((prev) =>
        prev.map((uploadFile) => {
          if (uploadFile.candidateId === data.candidateId) {
            return {
              ...uploadFile,
              progress: data.progress,
              message: data.message,
              status: data.progress === 100 ? "completed" : "parsing",
            };
          }
          return uploadFile;
        }),
      );

      setCurrentUpload((prev) => {
        if (prev?.candidateId === data.candidateId) {
          return {
            ...prev,
            progress: data.progress,
            message: data.message,
            status: data.progress === 100 ? "completed" : "parsing",
          };
        }
        return prev;
      });
    };

    const handleComplete = (data: { candidateId: string; data: any }) => {
      setUploadFiles((prev) =>
        prev.map((uploadFile) => {
          if (uploadFile.candidateId === data.candidateId) {
            return {
              ...uploadFile,
              status: "completed",
              progress: 100,
              message: "Complete!",
              result: data.data,
            };
          }
          return uploadFile;
        }),
      );

      setCurrentUpload((prev) => {
        if (prev?.candidateId === data.candidateId) {
          return {
            ...prev,
            status: "completed",
            progress: 100,
            message: "Complete!",
            result: data.data,
          };
        }
        return prev;
      });

      toast.success("Resume parsing completed!");
    };

    const handleFailed = (data: { candidateId: string; error: string }) => {
      setUploadFiles((prev) =>
        prev.map((uploadFile) => {
          if (uploadFile.candidateId === data.candidateId) {
            return {
              ...uploadFile,
              status: "error",
              message: "Failed",
              error: data.error,
            };
          }
          return uploadFile;
        }),
      );

      setCurrentUpload((prev) => {
        if (prev?.candidateId === data.candidateId) {
          return {
            ...prev,
            status: "error",
            message: "Failed",
            error: data.error,
          };
        }
        return prev;
      });

      toast.error("Resume parsing failed");
    };

    subscribeToParsingProgress(handleProgress);
    subscribeToParsingComplete(handleComplete);
    subscribeToParsingFailed(handleFailed);

    return () => {
      // Cleanup subscriptions
    };
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: "pending" as const,
        progress: 0,
        message: "Ready to upload",
      }));

      if (isBulkMode) {
        // Add files to uploadStore queue for bulk upload
        addFiles(acceptedFiles);
        // Also add to local state for UI display
        setUploadFiles((prev) => [...prev, ...newFiles]);
      } else {
        setUploadFiles(newFiles.slice(0, 1)); // Single file mode
      }
    },
    [isBulkMode, addFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: isBulkMode,
  });

  const extractSections = async (file: File): Promise<SectionData | null> => {
    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("force_ocr", forceOcr ? "true" : "false");

      const response = await api.post(
        `/upload/preview-sections`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Capture the full raw text for contact extraction
      const rawText = response.data.raw_text || "";
      setRawResumeText(rawText);

      // Capture extracted skills from text
      const skillsData = response.data.extracted_skills_from_text || null;
      setExtractedSkillsFromText(skillsData);

      // Backend returns extracted sections
      const rawSections = response.data.sections || {};
      return {
        experience: rawSections.experience || { text: "", char_count: 0 },
        education: rawSections.education || { text: "", char_count: 0 },
        skills: rawSections.skills || { text: "", char_count: 0 },
        summary: rawSections.summary || { text: "", char_count: 0 },
        certifications: rawSections.certifications || { text: "", char_count: 0 },
        projects: rawSections.projects || { text: "", char_count: 0 },
        contact: rawSections.contact || { text: "", char_count: 0 },
      };
    } catch (error: any) {
      console.error("Error extracting sections:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      return null;
    }
  };

  const handleUpload = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
              ...f,
              status: "uploading",
              message: "Uploading...",
              progress: 0,
            }
            : f,
        ),
      );

      if (!isBulkMode) {
        setCurrentUpload({
          ...uploadFile,
          status: "uploading",
          message: "Uploading...",
          progress: 0,
        });
      }

      // Extract sections first - STOP HERE, don't upload yet
      setIsExtractingSections(true);
      const sections = await extractSections(uploadFile.file);
      setExtractedSections(sections);
      setIsExtractingSections(false);

      // Clear currentUpload to show extracted sections UI
      setCurrentUpload(null);

      toast.success("Sections extracted! Review and parse with AI model.");
    } catch (error: any) {
      const errorMessage = error.message || "Upload failed";

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "error", message: "Failed", error: errorMessage }
            : f,
        ),
      );

      if (!isBulkMode) {
        setCurrentUpload((prev) =>
          prev
            ? {
              ...prev,
              status: "error",
              message: "Failed",
              error: errorMessage,
            }
            : null,
        );
      }

      toast.error(errorMessage);
    }
  };

  const handleViewBulkFile = (fileId: string) => {
    const file = uploadFiles.find(f => f.id === fileId);
    if (file && file.result) {
      setParsedSections({
        ...file.result,
        work_experience: file.result.work_history || file.result.work_experience || [],
      });
      setParsedName(file.result.contact?.name || "");
      setParsedEmail(file.result.contact?.email || "");
      setParsedPhone(file.result.contact?.phone || "");
      setParsedLinkedin(file.result.contact?.linkedin || "");
      setParsedPortfolio(
        file.result.contact?.portfolio_url ||
        file.result.contact?.portfolio ||
        file.result.contact?.website || ""
      );
      setViewingBulkFileId(fileId);

      // Reset editing states
      setEditingProjectIdx(null);
      setEditingCertIdx(null);
      setEditingWorkIdx(null);
      setEditingEduIdx(null);
      setIsAddingProject(false);
      setIsAddingCert(false);
      setIsAddingWork(false);
      setIsAddingEdu(false);

      toast.success("Ready to review. Scroll down to edit and save!");
    }
  };

  const handleBulkUpload = async () => {
    resetSummary();
    await uploadAll(isAIBulkMode ? "gpt-4o-mini" : "own-model");
  };

  const parseExtractedSections = async () => {
    if (!extractedSections) {
      toast.error("No sections extracted yet");
      return;
    }

    setIsParsingModel(true);
    setParsedSections(null);

    try {
      // Use relative URL - Vite proxy will forward to AI service on port 8000
      const response = await api.post<ParsedSectionsResponse>(
        `/upload/parse-sections`,
        {
          model: selectedLLM, // Send selected model (own-model or gpt-4o-mini)
          experience_text: extractedSections.experience?.text || "",
          education_text: extractedSections.education?.text || "",
          skills_text: extractedSections.skills?.text || "",
          summary_text: extractedSections.summary?.text || "",
          certifications_text: extractedSections.certifications?.text || "",
          projects_text: extractedSections.projects?.text || "",
          contact_text: extractedSections.contact?.text || "",
          raw_text: rawResumeText || "",  // Full resume text for accurate name/contact extraction
        }
      );

      const parsedData = {
        ...response.data,
        work_experience: response.data.work_history || response.data.work_experience || [],
      };
      setParsedSections(parsedData);
      toast.success("Sections parsed successfully!");
    } catch (error: any) {
      console.error("Error parsing sections:", error);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else if (error.code === "ERR_NETWORK") {
        toast.error("Unable to connect to AI service on port 8000");
      } else {
        toast.error("Failed to parse sections");
      }
    } finally {
      setIsParsingModel(false);
    } 
  };

  const saveCandidateProfile = async (forceSave: boolean = false) => {
    if (!parsedSections) {
      toast.error("No parsed data to save");
      return;
    }

    if (!isValidTextString(parsedName)) {
      toast.error("Candidate Name is required (min 2 chars, no pure special chars)");
      return;
    }
    if (parsedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsedEmail)) {
      toast.error("Invalid email format");
      return;
    }
    if (parsedPhone && parsedPhone.replace(/\D/g, '').length < 7) {
      toast.error("Invalid phone number format");
      return;
    }


    setIsSavingCandidate(true);

    try {
      const payload = {
        name: parsedName || "Parsed Candidate",
        email: parsedEmail || undefined,
        phone: parsedPhone || undefined,
        summary: parsedSections.summary || undefined,
        skills: parsedSections.skills,
        work_experience: parsedSections.work_experience,
        education: parsedSections.education,
        certifications: parsedSections.certifications,
        projects: parsedSections.projects,
        // Contact info from parsed sections
        linkedin_url: parsedLinkedin || parsedSections.contact?.linkedin || undefined,
        github_url: parsedSections.contact?.github || undefined,
        portfolio_url: parsedPortfolio ||
                       (parsedSections.contact as any)?.portfolio_url ||
                       (parsedSections.contact as any)?.portfolio ||
                       (parsedSections.contact as any)?.website || undefined,
        forceSave: forceSave,
      };

      const response = await api.post(
        `/candidates`,
        payload
      );

      toast.success("Candidate Profile saved successfully!");
      if (isBulkMode && viewingBulkFileId) {
        setUploadFiles(prev => prev.map(f => f.id === viewingBulkFileId ? { ...f, status: "saved", message: "Saved!" } : f));
        setViewingBulkFileId(null);
        setParsedSections(null);
      } else {
        if (response.data?.candidate?.id) {
          navigate(`/candidates/${response.data.candidate.id}`);
        } else {
          navigate("/candidates");
        }
      }
    } catch (error: any) {
      console.error("Error saving candidate:", error);

      // ── Handle duplicate candidate 409 specifically ──────────────────────
      if (error.response?.status === 409) {
        const errData = error.response.data;
        const fieldLabels: Record<string, string> = {
          email: "email address",
          phone: "phone number",
          "name+email": "name + email combination",
          "name+phone": "name + phone combination",
        };
        const fieldLabel = fieldLabels[errData?.field] || errData?.field || "contact details";
        const existingName = errData?.existingCandidateName
          ? ` (${errData.existingCandidateName})`
          : "";
        setDuplicateErrorModal({
          message: errData?.message || `Duplicate detected: a candidate with this ${fieldLabel} already exists${existingName}.`,
          field: errData?.field || "unknown",
          existingCandidateId: errData?.existingCandidateId || "",
          existingCandidateName: errData?.existingCandidateName || "",
        });
      } else {
        toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to save candidate profile");
      }
    } finally {
      setIsSavingCandidate(false);
    }
  };

  const resetUpload = () => {
    setUploadFiles([]);
    setCurrentUpload(null);
    setIsBulkMode(false);
    setIsAIBulkMode(false);
    setExtractedSections(null);
    setParsedSections(null);
    setParsedName("");
    setParsedEmail("");
    setParsedPhone("");
    setParsedLinkedin("");
    setParsedPortfolio("");
    setRawResumeText("");
    setExtractedSkillsFromText(null);
    resetSummary();
    clearQueue();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-10 right-10 w-[600px] h-[600px] bg-gradient-to-br from-teal-300/30 to-cyan-300/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/25 to-teal-300/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-gradient-to-br from-cyan-200/20 to-blue-200/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-800">Resume Parser</h1>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Upload and analyze resumes with AI-powered insights
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6">
          <div className="inline-flex items-center bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setIsBulkMode(false)}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${!isBulkMode
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Single Upload
            </button>
            <button
              onClick={() => { setIsBulkMode(true); setIsAIBulkMode(false); }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${isBulkMode && !isAIBulkMode
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
              Bulk Upload
            </button>

                 <button
              onClick={() => { setIsBulkMode(true); setIsAIBulkMode(true); setSelectedLLM("gpt-4o-mini"); }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${isAIBulkMode
                  ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-sm shadow-purple-500/20"
                  : "text-slate-600 hover:text-slate-900"
                }`}
            >
             AI Bulk Upload
            </button>
          </div>
        </div>

        {/* LLM Model Selector */}
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select AI Model for Experience Extraction
          </label>
          <div className="relative">
            <button
              onClick={() => setShowLLMDropdown(!showLLMDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1 text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {LLM_MODELS.find((m) => m.id === selectedLLM)?.name}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${selectedLLM === "own-model" ? "bg-gray-100 text-gray-800" : "bg-indigo-100 text-indigo-800"
                      }`}>
                      {LLM_MODELS.find((m) => m.id === selectedLLM)?.badge}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {LLM_MODELS.find((m) => m.id === selectedLLM)?.inputPrice} input / {LLM_MODELS.find((m) => m.id === selectedLLM)?.outputPrice} output per 1M tokens
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showLLMDropdown ? "rotate-180" : ""
                  }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showLLMDropdown && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
                {LLM_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedLLM(model.id);
                      setShowLLMDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${selectedLLM === model.id ? "bg-indigo-50" : ""
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {model.name}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${model.id === "own-model" ? "bg-gray-100 text-gray-800" : "bg-indigo-100 text-indigo-800"
                            }`}>
                            {model.badge}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {model.inputPrice} input / {model.outputPrice} output per 1M tokens
                        </div>
                      </div>
                      {selectedLLM === model.id && (
                        <svg
                          className="w-5 h-5 text-indigo-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedLLM === "own-model" && (
            <p className="mt-2 text-sm text-gray-600">
              Using built-in rule-based + BERT NER pipeline — no API call made
            </p>
          )}

          {/* Force OCR Toggle */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={forceOcr}
                onChange={(e) => setForceOcr(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-medium text-slate-800">Force OCR (for scanned resumes)</span>
                <p className="text-xs text-slate-500">Enable this to bypass normal text extraction and force image-to-text conversion</p>
              </div>
            </label>
          </div>
        </div>

        {/* Upload Area */}
        {!currentUpload && uploadFiles.length === 0 && (
          <div className="bg-white/60 backdrop-blur-md rounded-3xl border-2 border-dashed border-purple-200 p-20 hover:border-purple-400 hover:bg-white/70 transition-all duration-300 shadow-xl shadow-purple-100/50">
            <div
              {...getRootProps()}
              className={`text-center cursor-pointer transition-all duration-300 ${isDragActive
                  ? "scale-105"
                  : "hover:scale-[1.02]"
                }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30 mb-8">
                <svg
                  className="h-8 w-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">
                {isBulkMode ? "Upload Resume Files" : "Upload Resume File"}
              </h3>
              <p className="text-sm text-slate-600 mb-6">
                {isBulkMode
                  ? "Drag & drop your resume files here, or click to browse"
                  : "Drag & drop your resume file here, or click to browse"}
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Supports PDF, DOC, DOCX, JPG, JPEG, PNG, and WEBP files • Max 10MB per file
              </p>
              <button className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-purple-500/40 transition-all duration-200">
                Choose Files
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!currentUpload && uploadFiles.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-slate-800 mb-1">No Resumes Uploaded</h3>
            <p className="text-sm text-slate-500">Upload your first resume to get started with AI-powered analysis.</p>
          </div>
        )}

        {/* Single File Pending State */}
        {!isBulkMode && uploadFiles.length > 0 && !currentUpload && !extractedSections && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Ready to upload
                </h3>
                <p className="text-sm text-gray-500">
                  {uploadFiles[0].file.name} (
                  {formatFileSize(uploadFiles[0].file.size)})
                </p>
              </div>
              <div className="space-x-3">
                <button
                  onClick={() => handleUpload(uploadFiles[0])}
                  disabled={isExtractingSections}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExtractingSections ? "Extracting..." : "Upload & Extract Sections"}
                </button>
                <button
                  onClick={resetUpload}
                  className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Sections Preview / Parsed Results Editor */}
        {((extractedSections && !isBulkMode) || (parsedSections && viewingBulkFileId)) && (
          <div className="space-y-6 mt-8">
            {extractedSections && !isBulkMode && (
              <>
                {/* Section Preview Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Extracted Sections</h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Review and edit the extracted sections below before parsing with the AI model.
                  </p>
                </div>

                {/* Contact Information Section */}
                {extractedSections.contact && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">CONTACT INFORMATION</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.contact.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.contact.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            contact: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter contact details (Name, Email, Phone, Address, Links...)"
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Summary Section */}
                {extractedSections.summary && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">SUMMARY / OBJECTIVE</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.summary.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.summary.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            summary: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter professional summary or objective..."
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {extractedSections.experience && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">EXPERIENCE</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.experience.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.experience.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            experience: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter work experience history..."
                        className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Education Section */}
                {extractedSections.education && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">EDUCATION</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.education.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.education.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            education: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter educational history..."
                        className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Skills Section */}
                {extractedSections.skills && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">SKILLS</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.skills.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.skills.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            skills: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter technical and soft skills (comma separated or listed)..."
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Extracted Skills from Resume Text */}
                {extractedSkillsFromText && extractedSkillsFromText.total_skills > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          🎯 EXTRACTED SKILLS ({extractedSkillsFromText.total_skills})
                        </h3>
                        <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                          AI Extracted
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Skills automatically extracted from resume using SkillExtractor
                      </p>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Display by Category */}
                      {extractedSkillsFromText.categories && extractedSkillsFromText.categories.length > 0 && (
                        <div className="space-y-4">
                          {extractedSkillsFromText.categories.map((category: string) => (
                            <div key={category} className="border-l-4 border-blue-400 pl-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">{category}</h4>
                              <div className="flex flex-wrap gap-2">
                                {extractedSkillsFromText.skills_by_category[category]?.map((skill: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                    title={`Confidence: ${(skill.confidence * 100).toFixed(0)}%`}
                                  >
                                    {skill.name}
                                    <span className="ml-1.5 text-blue-500 text-[10px]">
                                      {(skill.confidence * 100).toFixed(0)}%
                                    </span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* All Skills (Flat List) */}
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">All Skills (Sorted by Confidence)</h4>
                        <div className="flex flex-wrap gap-2">
                          {extractedSkillsFromText.all_skills?.slice(0, 50).map((skill: any, idx: number) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 hover:shadow-sm transition-shadow"
                              title={`Category: ${skill.category || 'N/A'} | Confidence: ${(skill.confidence * 100).toFixed(0)}%`}
                            >
                              {skill.name}
                              <span className="ml-2 px-1.5 py-0.5 bg-blue-200 text-blue-700 rounded text-[10px] font-semibold">
                                {(skill.confidence * 100).toFixed(0)}%
                              </span>
                            </span>
                          ))}
                        </div>
                        {extractedSkillsFromText.all_skills?.length > 50 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Showing top 50 of {extractedSkillsFromText.all_skills.length} skills
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Projects Section */}
                {extractedSections.projects && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-green-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">PROJECTS</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.projects.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.projects.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            projects: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter project descriptions (double return for new project)..."
                        className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Certifications Section */}
                {extractedSections.certifications && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-violet-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">CERTIFICATIONS</h3>
                        <span className="text-sm text-gray-600">
                          {extractedSections.certifications.char_count.toLocaleString()} characters
                        </span>
                      </div>
                    </div>
                    <div className="p-6">
                      <textarea
                        value={extractedSections.certifications.text}
                        onChange={(e) => {
                          setExtractedSections(prev => prev ? {
                            ...prev,
                            certifications: {
                              text: e.target.value,
                              char_count: e.target.value.length
                            }
                          } : null);
                        }}
                        placeholder="Enter certifications list..."
                        className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}



                {/* Parse Button */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">AI Model Parsing</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Send extracted sections to DeBERTa model for structured entity extraction
                      </p>
                    </div>
                    <div className="space-x-3">
                      <button
                        onClick={parseExtractedSections}
                        disabled={isParsingModel}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isParsingModel ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Parsing...
                          </>
                        ) : (
                          "Parse with AI Model"
                        )}
                      </button>
                      <button
                        onClick={resetUpload}
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                      >
                        Upload Another
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Parsed Results */}
            {parsedSections && (
              <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Parsed Structured Data
                </h2>

                <div className="mb-6 bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    {parsedSections.message} (Processing time: {parsedSections.processing_time_ms.toFixed(2)}ms)
                  </p>
                </div>

                {/* Contact Details */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Contact Details (Rule-wise / Regex Extracted)
                    </h3>
                    <div className="flex gap-2">
                      {!isEditingContact ? (
                        <>
                          <button
                            onClick={handleStartEditContact}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleDeleteContact}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleSaveContact}
                            className="px-2.5 py-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setIsEditingContact(false)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingContact ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Candidate Name</label>
                        <input
                          type="text"
                          value={tempContact.name}
                          onChange={(e) => setTempContact({ ...tempContact, name: e.target.value })}
                          placeholder="Candidate name..."
                          className={`w-full px-2.5 py-1.5 bg-white border ${contactErrors.name ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {contactErrors.name && <p className="text-red-500 text-xs mt-1">{contactErrors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          value={tempContact.email}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempContact({ ...tempContact, email: val });
                            const err = validateEmail(val);
                            setContactErrors(prev => ({ ...prev, email: err }));
                          }}
                          onBlur={(e) => {
                            const err = validateEmail(e.target.value);
                            setContactErrors(prev => ({ ...prev, email: err }));
                          }}
                          placeholder="Email address..."
                          className={`w-full px-2.5 py-1.5 bg-white border ${contactErrors.email ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {contactErrors.email && <p className="text-red-500 text-xs mt-1">{contactErrors.email}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={tempContact.phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempContact({ ...tempContact, phone: val });
                            const err = validatePhone(val);
                            setContactErrors(prev => ({ ...prev, phone: err }));
                          }}
                          onBlur={(e) => {
                            const err = validatePhone(e.target.value);
                            setContactErrors(prev => ({ ...prev, phone: err }));
                          }}
                          placeholder="Phone number..."
                          className={`w-full px-2.5 py-1.5 bg-white border ${contactErrors.phone ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {contactErrors.phone && <p className="text-red-500 text-xs mt-1">{contactErrors.phone}</p>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">LinkedIn URL</label>
                        <input
                          type="url"
                          value={tempContact.linkedin || ""}
                          onChange={(e) => setTempContact({ ...tempContact, linkedin: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Portfolio / Website</label>
                        <input
                          type="url"
                          value={tempContact.portfolio || ""}
                          onChange={(e) => setTempContact({ ...tempContact, portfolio: e.target.value })}
                          placeholder="https://yourportfolio.com"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
                      {/* Row 1: Name · Email · Phone */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Candidate Name</span>
                          <span className="font-medium text-gray-900">{parsedName || <span className="text-gray-400 italic">Not available</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Email Address</span>
                          <span className="font-medium text-gray-900">{parsedEmail || <span className="text-gray-400 italic">Not available</span>}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Phone Number</span>
                          <span className="font-medium text-gray-900">{parsedPhone || <span className="text-gray-400 italic">Not available</span>}</span>
                        </div>
                      </div>
                      {/* Row 2: LinkedIn · Portfolio · Experience */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">LinkedIn URL</span>
                          {parsedLinkedin ? (
                            <a
                              href={parsedLinkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-800 break-all"
                            >
                              {parsedLinkedin}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Not available</span>
                          )}
                        </div>
                        <div>
                          <span className="text-gray-500 block text-xs mb-1">Portfolio / Website</span>
                          {parsedPortfolio ? (
                            <a
                              href={parsedPortfolio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:text-blue-800 break-all"
                            >
                              {parsedPortfolio}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">Not available</span>
                          )}
                        </div>

                      </div>
                    </div>
                  )}
                </div>

                {/* Professional Summary */}
                {(parsedSections.summary !== null && parsedSections.summary !== undefined) && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Professional Summary (Rule-wise)
                      </h3>
                      <div className="flex gap-2">
                        {!isEditingSummary ? (
                          <>
                            <button
                              onClick={handleStartEditSummary}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={handleDeleteSummary}
                              className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={handleSaveSummary}
                              className="px-2.5 py-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setIsEditingSummary(false)}
                              className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {isEditingSummary ? (
                      <textarea
                        value={editSummaryText}
                        onChange={(e) => setEditSummaryText(e.target.value)}
                        className="w-full h-32 p-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {parsedSections.summary || <span className="text-gray-400 italic">No summary details.</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Total Experience Banner */}
                {(parsedSections.work_experience?.length || 0) > 0 && (() => {
                  const { total } = calculateTotalExperience(parsedSections.work_experience || []);
                  if (total.total_records > 0) {
                      return (
                        <div className="mb-6 bg-[#f2faf0] rounded-xl p-4 border border-green-200 shadow-sm flex flex-col xl:flex-row items-center gap-4 justify-between">
                          {/* Left: Total Experience */}
                          <div className="flex items-center gap-3 flex-shrink-0 min-w-max">
                            <div className="w-10 h-10 bg-[#bdf0c1] rounded flex items-center justify-center shrink-0">
                              <Briefcase className="w-5 h-5 text-green-800" />
                            </div>
                            <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Total Experience</p>
                              <p className="text-xl font-bold text-green-700 whitespace-nowrap tracking-tight">{total.formatted_string}</p>
                            </div>
                          </div>
                          
                          {/* Middle: From / To */}
                          {total.earliest_date && total.latest_date && (
                            <div className="flex items-center gap-6 px-4 py-2 bg-[#f8fcf7] rounded-lg border border-green-100 shrink-0 mx-auto w-full xl:w-auto justify-center">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 font-semibold uppercase">From</p>
                                  <p className="text-[13px] font-bold text-gray-800 whitespace-nowrap">{new Date(total.earliest_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                                </div>
                              </div>
                              <div className="w-px h-8 bg-green-200" />
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center">
                                  <Calendar className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-400 font-semibold uppercase">To</p>
                                  <p className="text-[13px] font-bold text-gray-800 whitespace-nowrap">{new Date(total.latest_date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'})}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Right: Calculated from */}
                          <div className="text-center xl:text-right shrink-0 min-w-max">
                            <p className="text-[11px] text-gray-500 font-medium mb-0.5">Calculated from</p>
                            <p className="text-sm font-bold text-green-700">{total.total_records} Employment Records</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">(Based on start and end dates)</p>
                          </div>
                        </div>
                      );
                  }
                  return null;
                })()}

                {/* Work Experience Results */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Work Experience ({parsedSections.work_experience?.length || 0} entries - Model-wise)
                    </h3>
                    {!isAddingWork && (
                      <button
                        onClick={() => setIsAddingWork(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        + Add Work Experience
                      </button>
                    )}
                  </div>

                  {isAddingWork && (
                    <div className="mb-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
                      <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">New Work Experience</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <input
                            type="text"
                            placeholder="Job Title"
                            value={newWorkData.job_title}
                            onChange={(e) => {
                              setNewWorkData({ ...newWorkData, job_title: e.target.value });
                              if (newWorkErrors.job_title) setNewWorkErrors({ ...newWorkErrors, job_title: null });
                            }}
                            onBlur={(e) => {
                              const err = validateJobTitle(e.target.value);
                              if (err) setNewWorkErrors({ ...newWorkErrors, job_title: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newWorkErrors.job_title ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newWorkErrors.job_title && <p className="text-red-500 text-xs mt-1">{newWorkErrors.job_title}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Company Name"
                            value={newWorkData.company_name}
                            onChange={(e) => {
                              setNewWorkData({ ...newWorkData, company_name: e.target.value });
                              if (newWorkErrors.company_name) setNewWorkErrors({ ...newWorkErrors, company_name: null });
                            }}
                            onBlur={(e) => {
                              const err = validateCompanyName(e.target.value);
                              if (err) setNewWorkErrors({ ...newWorkErrors, company_name: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newWorkErrors.company_name ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newWorkErrors.company_name && <p className="text-red-500 text-xs mt-1">{newWorkErrors.company_name}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Location"
                            value={newWorkData.location}
                            onChange={(e) => {
                              setNewWorkData({ ...newWorkData, location: e.target.value });
                              if (newWorkErrors.location) setNewWorkErrors({ ...newWorkErrors, location: null });
                            }}
                            onBlur={(e) => {
                              const err = validateLocation(e.target.value);
                              if (err) setNewWorkErrors({ ...newWorkErrors, location: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newWorkErrors.location ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newWorkErrors.location && <p className="text-red-500 text-xs mt-1">{newWorkErrors.location}</p>}
                        </div>
                        <div>
                          <input
                            type="date"
                            value={parseToDateInput(newWorkData.start_date)}
                            onChange={(e) => {
                              setNewWorkData({ ...newWorkData, start_date: e.target.value });
                              if (newWorkErrors.start_date) setNewWorkErrors({ ...newWorkErrors, start_date: null });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newWorkErrors.start_date ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newWorkErrors.start_date && <p className="text-red-500 text-xs mt-1">{newWorkErrors.start_date}</p>}
                        </div>
                        <div>
                          <input
                            type="date"
                            disabled={newWorkData.is_current}
                            value={newWorkData.is_current ? "" : parseToDateInput(newWorkData.end_date)}
                            onChange={(e) => {
                              setNewWorkData({ ...newWorkData, end_date: e.target.value });
                              if (newWorkErrors.end_date) setNewWorkErrors({ ...newWorkErrors, end_date: null });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newWorkErrors.end_date ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:bg-gray-100`}
                          />
                          {newWorkErrors.end_date && <p className="text-red-500 text-xs mt-1">{newWorkErrors.end_date}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="is_current"
                            checked={newWorkData.is_current}
                            onChange={(e) => setNewWorkData({ ...newWorkData, is_current: e.target.checked })}
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <label htmlFor="is_current" className="text-xs font-semibold text-gray-700">Currently Working Here</label>
                        </div>
                      </div>
                      <textarea
                        placeholder="Job Description..."
                        value={newWorkData.description}
                        onChange={(e) => setNewWorkData({ ...newWorkData, description: e.target.value })}
                        className="w-full p-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                      />
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={handleAddWork}
                          className="px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingWork(false)}
                          className="px-3 py-1.5 font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(parsedSections.work_experience || []).map((exp, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative group">
                        <div className="absolute top-4 right-4 flex gap-1.5 transition-opacity">
                          {editingWorkIdx !== idx ? (
                            <>
                              <button
                                onClick={() => handleStartEditWork(idx, exp)}
                                className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWork(idx)}
                                className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded hover:bg-red-100 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSaveWork(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-green-600 bg-white border border-green-200 rounded-md hover:bg-green-50 transition-colors shadow-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingWorkIdx(null); setEditWorkData(null); }}
                                className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>

                        {editingWorkIdx === idx ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Job Title</label>
                                <input
                                  type="text"
                                  value={editWorkData.job_title || ""}
                                  onChange={(e) => {
                                    setEditWorkData({ ...editWorkData, job_title: e.target.value });
                                    if (workErrors.job_title) setWorkErrors({ ...workErrors, job_title: null });
                                  }}
                                  onBlur={(e) => {
                                    const err = validateJobTitle(e.target.value);
                                    if (err) setWorkErrors({ ...workErrors, job_title: err });
                                  }}
                                  className={`w-full px-2.5 py-1.5 bg-white border ${workErrors.job_title ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                                />
                                {workErrors.job_title && <p className="text-red-500 text-xs mt-1">{workErrors.job_title}</p>}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Company</label>
                                <input
                                  type="text"
                                  value={editWorkData.company_name || ""}
                                  onChange={(e) => {
                                    setEditWorkData({ ...editWorkData, company_name: e.target.value });
                                    if (workErrors.company_name) setWorkErrors({ ...workErrors, company_name: null });
                                  }}
                                  onBlur={(e) => {
                                    const err = validateCompanyName(e.target.value);
                                    if (err) setWorkErrors({ ...workErrors, company_name: err });
                                  }}
                                  className={`w-full px-2.5 py-1.5 bg-white border ${workErrors.company_name ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                                />
                                {workErrors.company_name && <p className="text-red-500 text-xs mt-1">{workErrors.company_name}</p>}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Location</label>
                                <input
                                  type="text"
                                  value={editWorkData.location || ""}
                                  onChange={(e) => {
                                    setEditWorkData({ ...editWorkData, location: e.target.value });
                                    if (workErrors.location) setWorkErrors({ ...workErrors, location: null });
                                  }}
                                  onBlur={(e) => {
                                    const err = validateLocation(e.target.value);
                                    if (err) setWorkErrors({ ...workErrors, location: err });
                                  }}
                                  className={`w-full px-2.5 py-1.5 bg-white border ${workErrors.location ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                                />
                                {workErrors.location && <p className="text-red-500 text-xs mt-1">{workErrors.location}</p>}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={parseToDateInput(editWorkData.start_date)}
                                  onChange={(e) => {
                                    setEditWorkData({ ...editWorkData, start_date: e.target.value });
                                    if (workErrors.start_date) setWorkErrors({ ...workErrors, start_date: null });
                                  }}
                                  className={`w-full px-2.5 py-1.5 bg-white border ${workErrors.start_date ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                                />
                                {workErrors.start_date && <p className="text-red-500 text-xs mt-1">{workErrors.start_date}</p>}
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                                <input
                                  type="date"
                                  disabled={editWorkData.is_current}
                                  value={editWorkData.is_current ? "" : parseToDateInput(editWorkData.end_date)}
                                  onChange={(e) => {
                                    setEditWorkData({ ...editWorkData, end_date: e.target.value });
                                    if (workErrors.end_date) setWorkErrors({ ...workErrors, end_date: null });
                                  }}
                                  className={`w-full px-2.5 py-1.5 bg-white border ${workErrors.end_date ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm disabled:opacity-50 disabled:bg-gray-100`}
                                />
                                {workErrors.end_date && <p className="text-red-500 text-xs mt-1">{workErrors.end_date}</p>}
                              </div>
                              <div className="flex items-center gap-2 pt-5">
                                <input
                                  type="checkbox"
                                  id={`edit_is_current_${idx}`}
                                  checked={editWorkData.is_current || false}
                                  onChange={(e) => setEditWorkData({ ...editWorkData, is_current: e.target.checked })}
                                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <label htmlFor={`edit_is_current_${idx}`} className="text-xs font-semibold text-gray-700">Currently Working Here</label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Job Description</label>
                              <textarea
                                value={editWorkData.description || ""}
                                onChange={(e) => setEditWorkData({ ...editWorkData, description: e.target.value })}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm h-20 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-sm pr-20">
                            {(exp.job_title || exp.title) && (
                              <div>
                                <span className="text-gray-600">Job Title:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.job_title || exp.title}</span>
                              </div>
                            )}
                            {(exp.company_name || exp.company) && (
                              <div>
                                <span className="text-gray-600">Company:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.company_name || exp.company}</span>
                              </div>
                            )}
                            {exp.location && (
                              <div>
                                <span className="text-gray-600">Location:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.location}</span>
                              </div>
                            )}
                            {exp.start_date && (
                              <div>
                                <span className="text-gray-600">Start Date:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.start_date}</span>
                              </div>
                            )}
                            {(exp.end_date || exp.is_current) && (
                              <div>
                                <span className="text-gray-600">End Date:</span>
                                <span className="font-medium text-gray-900 ml-2">{exp.end_date || (exp.is_current ? "Present" : "Unknown")}</span>
                              </div>
                            )}
                            {(() => {
                              const { processed } = calculateTotalExperience([exp]);
                              const duration = processed[0]?.duration_string;
                              return duration && duration !== "0 Months" ? (
                                <div>
                                  <span className="text-gray-600">Duration:</span>
                                  <span className="font-medium text-gray-900 ml-2">{duration}</span>
                                </div>
                              ) : null;
                            })()}
                            {exp.description && (
                              <div className="col-span-2 mt-2">
                                <span className="text-gray-600 block mb-1">Description:</span>
                                <p className="text-gray-800 whitespace-pre-wrap">{exp.description}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {(parsedSections.work_experience?.length || 0) === 0 && (
                      <p className="text-sm text-gray-500 italic">No work experience entries.</p>
                    )}
                  </div>
                </div>

                {/* Education Results */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Education ({parsedSections.education?.length || 0} entries - Model-wise)
                    </h3>
                    {!isAddingEdu && (
                      <button
                        onClick={() => setIsAddingEdu(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        + Add Education
                      </button>
                    )}
                  </div>

                  {isAddingEdu && (
                    <div className="mb-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
                      <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">New Education</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <input
                            type="text"
                            placeholder="Degree / Qualification"
                            value={newEduData.degree}
                            onChange={(e) => {
                              setNewEduData({ ...newEduData, degree: e.target.value });
                              if (newEduErrors.degree) setNewEduErrors({ ...newEduErrors, degree: null });
                            }}
                            onBlur={(e) => {
                              const err = validateDegree(e.target.value);
                              if (err) setNewEduErrors({ ...newEduErrors, degree: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newEduErrors.degree ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newEduErrors.degree && <p className="text-red-500 text-xs mt-1">{newEduErrors.degree}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Institution / University"
                            value={newEduData.institution}
                            onChange={(e) => {
                              setNewEduData({ ...newEduData, institution: e.target.value });
                              if (newEduErrors.institution) setNewEduErrors({ ...newEduErrors, institution: null });
                            }}
                            onBlur={(e) => {
                              const err = validateInstitution(e.target.value);
                              if (err) setNewEduErrors({ ...newEduErrors, institution: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newEduErrors.institution ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newEduErrors.institution && <p className="text-red-500 text-xs mt-1">{newEduErrors.institution}</p>}
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Field of Study"
                            value={newEduData.field_of_study}
                            onChange={(e) => {
                              setNewEduData({ ...newEduData, field_of_study: e.target.value });
                              if (newEduErrors.field_of_study) setNewEduErrors({ ...newEduErrors, field_of_study: null });
                            }}
                            onBlur={(e) => {
                              const err = validateFieldOfStudy(e.target.value);
                              if (err) setNewEduErrors({ ...newEduErrors, field_of_study: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newEduErrors.field_of_study ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newEduErrors.field_of_study && <p className="text-red-500 text-xs mt-1">{newEduErrors.field_of_study}</p>}
                        </div>
                        <div>
                          <input
                            type="date"
                            value={parseToDateInput(newEduData.start_year)}
                            onChange={(e) => {
                              setNewEduData({ ...newEduData, start_year: e.target.value });
                              if (newEduErrors.start_year) setNewEduErrors({ ...newEduErrors, start_year: null });
                            }}
                            onBlur={(e) => {
                              const err = validateEduDate(e.target.value);
                              if (err) setNewEduErrors({ ...newEduErrors, start_year: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newEduErrors.start_year ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newEduErrors.start_year && <p className="text-red-500 text-xs mt-1">{newEduErrors.start_year}</p>}
                        </div>
                        <div>
                          <input
                            type="date"
                            value={parseToDateInput(newEduData.end_year)}
                            onChange={(e) => {
                              setNewEduData({ ...newEduData, end_year: e.target.value });
                              if (newEduErrors.end_year) setNewEduErrors({ ...newEduErrors, end_year: null });
                            }}
                            onBlur={(e) => {
                              const err = validateEduDate(e.target.value);
                              if (err) setNewEduErrors({ ...newEduErrors, end_year: err });
                            }}
                            className={`w-full px-3 py-1.5 bg-white border ${newEduErrors.end_year ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                          {newEduErrors.end_year && <p className="text-red-500 text-xs mt-1">{newEduErrors.end_year}</p>}
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="GPA / Percentage"
                            value={newEduData.gpa ?? ""}
                            onChange={(e) => setNewEduData({ ...newEduData, gpa: e.target.value ? parseFloat(e.target.value) : null })}
                            className={`w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={handleAddEdu}
                          className="px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingEdu(false)}
                          className="px-3 py-1.5 font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(parsedSections.education || []).map((edu, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative group">
                        <div className="absolute top-4 right-4 flex gap-1.5 transition-opacity">
                          {editingEduIdx !== idx ? (
                            <>
                              <button
                                onClick={() => handleStartEditEdu(idx, edu)}
                                className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteEdu(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSaveEdu(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-green-600 bg-white border border-green-200 rounded-md hover:bg-green-50 transition-colors shadow-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingEduIdx(null); setEditEduData(null); }}
                                className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>

                        {editingEduIdx === idx ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Degree</label>
                              <input
                                type="text"
                                value={editEduData.degree || ""}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, degree: e.target.value });
                                  if (eduErrors.degree) setEduErrors({ ...eduErrors, degree: null });
                                }}
                                onBlur={(e) => {
                                  const err = validateDegree(e.target.value);
                                  if (err) setEduErrors({ ...eduErrors, degree: err });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border ${eduErrors.degree ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                              />
                              {eduErrors.degree && <p className="text-red-500 text-xs mt-1">{eduErrors.degree}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Institution</label>
                              <input
                                type="text"
                                value={editEduData.institution || ""}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, institution: e.target.value });
                                  if (eduErrors.institution) setEduErrors({ ...eduErrors, institution: null });
                                }}
                                onBlur={(e) => {
                                  const err = validateInstitution(e.target.value);
                                  if (err) setEduErrors({ ...eduErrors, institution: err });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border ${eduErrors.institution ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                              />
                              {eduErrors.institution && <p className="text-red-500 text-xs mt-1">{eduErrors.institution}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Field of Study</label>
                              <input
                                type="text"
                                value={editEduData.field_of_study || ""}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, field_of_study: e.target.value });
                                  if (eduErrors.field_of_study) setEduErrors({ ...eduErrors, field_of_study: null });
                                }}
                                onBlur={(e) => {
                                  const err = validateFieldOfStudy(e.target.value);
                                  if (err) setEduErrors({ ...eduErrors, field_of_study: err });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border ${eduErrors.field_of_study ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                              />
                              {eduErrors.field_of_study && <p className="text-red-500 text-xs mt-1">{eduErrors.field_of_study}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                              <input
                                type="date"
                                value={parseToDateInput(editEduData.start_year)}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, start_year: e.target.value });
                                  if (eduErrors.start_year) setEduErrors({ ...eduErrors, start_year: null });
                                }}
                                onBlur={(e) => {
                                  const err = validateEduDate(e.target.value);
                                  if (err) setEduErrors({ ...eduErrors, start_year: err });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border ${eduErrors.start_year ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                              />
                              {eduErrors.start_year && <p className="text-red-500 text-xs mt-1">{eduErrors.start_year}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                              <input
                                type="date"
                                value={parseToDateInput(editEduData.end_year)}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, end_year: e.target.value });
                                  if (eduErrors.end_year) setEduErrors({ ...eduErrors, end_year: null });
                                }}
                                onBlur={(e) => {
                                  const err = validateEduDate(e.target.value);
                                  if (err) setEduErrors({ ...eduErrors, end_year: err });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border ${eduErrors.end_year ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm`}
                              />
                              {eduErrors.end_year && <p className="text-red-500 text-xs mt-1">{eduErrors.end_year}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">GPA / Percentage</label>
                              <input
                                type="text"
                                placeholder="e.g. 3.8 or 8.5/10 or 85%"
                                value={editEduData.grade ?? editEduData.gpa ?? ""}
                                onChange={(e) => {
                                  setEditEduData({ ...editEduData, grade: e.target.value, gpa: e.target.value ? parseFloat(e.target.value) : null });
                                }}
                                className={`w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-sm`}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-sm pr-20">
                            {edu.degree && (
                              <div>
                                <span className="text-gray-600">Degree:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.degree}</span>
                              </div>
                            )}
                            {edu.institution && (
                              <div>
                                <span className="text-gray-600">Institution:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.institution}</span>
                              </div>
                            )}
                            {edu.field_of_study && (
                              <div>
                                <span className="text-gray-600">Field:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.field_of_study}</span>
                              </div>
                            )}
                            {edu.start_year && (
                              <div>
                                <span className="text-gray-600">Start:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.start_year}</span>
                              </div>
                            )}
                            {edu.end_year && (
                              <div>
                                <span className="text-gray-600">End:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.end_year}</span>
                              </div>
                            )}
                            {(edu.grade != null || edu.gpa != null) && (
                              <div>
                                <span className="text-gray-600">GPA/Percentage:</span>
                                <span className="font-medium text-gray-900 ml-2">{edu.grade ?? edu.gpa}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {(parsedSections.education?.length || 0) === 0 && (
                      <p className="text-sm text-gray-500 italic">No education entries.</p>
                    )}
                  </div>
                </div>

                {/* Skills Results */}
                <div className="mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Extracted Skills ({parsedSections.skills?.length || 0} - Rule-wise)
                    </h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add a skill..."
                          value={newSkillText}
                          onChange={(e) => setNewSkillText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          className={`px-3 py-1 bg-white border ${skillError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 w-36`}
                        />
                        <button
                          onClick={handleAddSkill}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 font-medium"
                        >
                          Add
                        </button>
                      </div>
                      {skillError && <p className="text-red-500 text-[10px] m-0">{skillError}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(parsedSections.skills || []).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-sm group hover:bg-purple-100 transition-colors"
                      >
                        {skill}
                        <button
                          onClick={() => handleDeleteSkill(idx)}
                          className="text-purple-400 hover:text-purple-700 transition-colors font-bold text-xs"
                          aria-label="Remove skill"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {(parsedSections.skills?.length || 0) === 0 && (
                      <p className="text-sm text-gray-500 italic">No skills added yet.</p>
                    )}
                  </div>
                </div>

                {/* Projects Results */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Projects ({parsedSections.projects?.length || 0} - Rule-wise)
                    </h3>
                    {!isAddingProject && (
                      <button
                        onClick={() => setIsAddingProject(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        + Add Project
                      </button>
                    )}
                  </div>

                  {isAddingProject && (
                    <div className="mb-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
                      <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">New Project Description</h4>
                      <div className="flex flex-col gap-1">
                        <textarea
                          placeholder="Enter project details..."
                          value={newProjectText}
                          onChange={(e) => setNewProjectText(e.target.value)}
                          className={`w-full p-3 bg-white border ${newProjectError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-24`}
                        />
                        {newProjectError && <p className="text-red-500 text-xs mt-1">{newProjectError}</p>}
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={handleAddProject}
                          className="px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingProject(false)}
                          className="px-3 py-1.5 font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(parsedSections.projects || []).map((proj, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative group">
                        <div className="absolute top-4 right-4 flex gap-1.5 transition-opacity">
                          {editingProjectIdx !== idx ? (
                            <>
                              <button
                                onClick={() => handleStartEditProject(idx, proj)}
                                className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteProject(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSaveProject(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-green-600 bg-white border border-green-200 rounded-md hover:bg-green-50 transition-colors shadow-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingProjectIdx(null); setEditProjectText(""); }}
                                className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>

                        {editingProjectIdx === idx ? (
                          <div className="flex flex-col w-full gap-1">
                            <textarea
                              value={editProjectText}
                              onChange={(e) => setEditProjectText(e.target.value)}
                              className={`w-full p-2.5 bg-white border ${projectError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm h-24 focus:outline-none`}
                            />
                            {projectError && <p className="text-red-500 text-xs mt-1">{projectError}</p>}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed pr-20">
                            {proj}
                          </div>
                        )}
                      </div>
                    ))}
                    {(parsedSections.projects?.length || 0) === 0 && (
                      <p className="text-sm text-gray-500 italic">No projects entries.</p>
                    )}
                  </div>
                </div>

                {/* Certifications Results */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Certifications ({parsedSections.certifications?.length || 0} - Rule-wise)
                    </h3>
                    {!isAddingCert && (
                      <button
                        onClick={() => setIsAddingCert(true)}
                        className="px-2.5 py-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        + Add Certification
                      </button>
                    )}
                  </div>

                  {isAddingCert && (
                    <div className="mb-4 bg-purple-50/50 p-4 rounded-xl border border-purple-200 space-y-3">
                      <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">New Certification Name</h4>
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          placeholder="e.g. AWS Certified Solutions Architect"
                          value={newCertText}
                          onChange={(e) => setNewCertText(e.target.value)}
                          className={`w-full px-3 py-1.5 bg-white border ${newCertError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                        {newCertError && <p className="text-red-500 text-xs mt-1">{newCertError}</p>}
                      </div>
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={handleAddCert}
                          className="px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => setIsAddingCert(false)}
                          className="px-3 py-1.5 font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <ul className="space-y-2">
                    {(parsedSections.certifications || []).map((cert, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 text-sm text-gray-700 relative group">
                        {editingCertIdx === idx ? (
                          <div className="flex items-center gap-2 w-full pr-20">
                            <div className="flex flex-col w-full gap-1">
                              <input
                                type="text"
                                value={editCertText}
                                onChange={(e) => setEditCertText(e.target.value)}
                                className={`flex-grow px-2 py-1 bg-white border ${certError ? 'border-red-500' : 'border-gray-200'} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500`}
                              />
                              {certError && <p className="text-red-500 text-xs mt-1">{certError}</p>}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 pr-20">
                            <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
                            </svg>
                            {cert}
                          </div>
                        )}

                        <div className="absolute right-4 flex gap-1.5 transition-opacity">
                          {editingCertIdx !== idx ? (
                            <>
                              <button
                                onClick={() => handleStartEditCert(idx, cert)}
                                className="px-2 py-0.5 text-xs font-semibold text-blue-600 bg-white border border-blue-200 rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCert(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleSaveCert(idx)}
                                className="px-2 py-0.5 text-xs font-semibold text-green-600 bg-white border border-green-200 rounded-md hover:bg-green-50 transition-colors shadow-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => { setEditingCertIdx(null); setEditCertText(""); }}
                                className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors shadow-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                    {(parsedSections.certifications?.length || 0) === 0 && (
                      <p className="text-sm text-gray-500 italic">No certifications entries.</p>
                    )}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                  <button
                    onClick={() => saveCandidateProfile()}
                    disabled={isSavingCandidate}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-lg hover:shadow-green-500/20 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingCandidate ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      "Save Candidate Profile"
                    )}
                  </button>
                  <button
                    onClick={resetUpload}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single Upload Progress */}
        {currentUpload && !isBulkMode && (
          <>
            {/* Show progress UI only during upload/parsing */}
            {(currentUpload.status === "uploading" || currentUpload.status === "parsing" || currentUpload.status === "error") && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Uploading: {currentUpload.file.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Size: {formatFileSize(currentUpload.file.size)}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {currentUpload.message}
                    </span>
                    <span className="text-sm text-gray-500">
                      {currentUpload.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${currentUpload.progress}%` }}
                    />
                  </div>
                </div>

                {/* Speed Gauge - Show during parsing */}
                {currentUpload.status === "parsing" && (
                  <div className="mb-4 bg-gray-50 rounded-lg p-4">
                    <SpeedGauge value={currentUpload.progress} label="Parsing Progress" />
                  </div>
                )}

                {/* Error State */}
                {currentUpload.status === "error" && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 text-sm">{currentUpload.error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Completed State - No wrapper */}
            {currentUpload.status === "completed" && currentUpload.result && (
              <>
                {console.log("📊 Upload result:", currentUpload.result)}
                {console.log("🔍 model_results field:", currentUpload.result.model_results)}

                <ParsedResultCard
                  result={currentUpload.result}
                  candidateId={currentUpload.candidateId}
                  onUploadAnother={resetUpload}
                />

                {/* Model Results View - Raw DeBERTa Extraction */}
                {currentUpload.result.model_results ? (
                  <div className="mt-6">
                    <ModelResultsView modelResults={currentUpload.result.model_results} />
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ No model_results found in API response. Check backend logs.
                    </p>
                  </div>
                )}

                {/* Debug View - Full Parsed JSON */}
                <div className="mt-6">
                  <ParsedDataDebugView
                    data={currentUpload.result}
                    candidateId={currentUpload.candidateId}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Bulk Upload */}
        {isBulkMode && queue.length > 0 && (
          <div className="space-y-4">
            {/* Upload Controls */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {queue.length} file{queue.length !== 1 ? "s" : ""}{" "}
                  selected
                </h3>
                <div className="space-x-3">
                  <button
                    onClick={handleBulkUpload}
                    disabled={queue.some(
                      (f) => f.status === "uploading" || f.status === "parsing" || f.status === "previewing" || f.status === "saving",
                    )}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Upload All
                  </button>
                  <button
                    onClick={() => {
                      resetUpload();
                      resetSummary();
                      clearQueue();
                    }}
                    className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* File List */}
            {queue.map((uploadFile: any) => (
              <div
                key={uploadFile.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {uploadFile.file.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        uploadFile.status === "completed" || uploadFile.status === "saved" || uploadFile.status === "success"
                          ? "bg-gradient-to-r from-teal-500 to-teal-600 text-white"
                          : uploadFile.status === "error" || uploadFile.status === "failed"
                            ? "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                          : uploadFile.status === "duplicate"
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                          : uploadFile.status === "previewing"
                            ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                          : uploadFile.status === "parsing"
                            ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                          : uploadFile.status === "saving"
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "bg-slate-100 text-slate-700"
                        }`}
                    >
                      {uploadFile.status === "success" || uploadFile.status === "saved" ? "Saved" : 
                       uploadFile.status === "failed" || uploadFile.status === "error" ? "Failed" : 
                       uploadFile.status === "duplicate" ? "Duplicate" :
                       uploadFile.status === "queued" ? "Queued" :
                       uploadFile.status.charAt(0).toUpperCase() + uploadFile.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                {uploadFile.status !== "queued" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {uploadFile.message}
                      </span>
                      <span className="text-sm text-gray-500">
                        {uploadFile.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${uploadFile.status === "error" || uploadFile.status === "failed"
                            ? "bg-gradient-to-r from-red-500 to-pink-500"
                            : "bg-gradient-to-r from-purple-600 to-blue-600"
                          }`}
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                    {uploadFile.status === "completed" && !uploadFile.candidateId && (
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => handleViewBulkFile(uploadFile.id)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Review Profile
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {uploadFile.error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                    {uploadFile.error}
                  </div>
                )}
              </div>
            ))}

            {/* Summary */}
            {uploadComplete && (
              <div className="mb-6">
                <BulkUploadSummary
                  totalUploaded={summary.totalUploaded}
                  successful={summary.successful}
                  duplicates={summary.duplicates}
                  failed={summary.failed}
                  failedFiles={summary.failedFiles}
                  duplicateFiles={summary.duplicateFiles}
                  onDismiss={() => resetSummary()}
                  onDownloadFailed={() => {
                    // Download failed files list as JSON
                    const failedList = summary.failedFiles.map(f => ({
                      fileName: f.fileName,
                      error: f.error,
                    }));
                    const blob = new Blob([JSON.stringify(failedList, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `failed-resumes-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onDownloadDuplicates={() => {
                    // Download duplicate files list as JSON
                    const duplicateList = summary.duplicateFiles.map(f => ({
                      fileName: f.fileName,
                      message: f.message,
                      field: f.field,
                      existingCandidateId: f.existingCandidateId,
                      existingCandidateName: f.existingCandidateName,
                    }));
                    const blob = new Blob([JSON.stringify(duplicateList, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `duplicate-resumes-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  onViewDuplicate={(duplicateFile) => {
                    setDuplicateModal(duplicateFile);
                  }}
                />
              </div>
            )}

            {/* Legacy Summary (for non-bulk mode) */}
            {!isBulkMode && uploadFiles.length > 0 &&
              uploadFiles.every(
                (f) => f.status === "completed" || f.status === "error",
              ) && !uploadComplete && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Upload Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {
                          uploadFiles.filter((f) => f.status === "completed")
                            .length
                        }
                      </p>
                      <p className="text-sm text-gray-600">Successful</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {uploadFiles.filter((f) => f.status === "error").length}
                      </p>
                      <p className="text-sm text-gray-600">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-600">
                        {uploadFiles.length}
                      </p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-200 font-medium"
                  >
                    Upload More Files
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Duplicate Candidate Modal */}
      <DuplicateCandidateModal
        open={!!duplicateErrorModal}
        onClose={() => setDuplicateErrorModal(null)}
        errorData={duplicateErrorModal as any}
        newCandidateData={{
          name: parsedName,
          email: parsedEmail,
          phone: parsedPhone,
          summary: parsedSections?.summary,
          education: parsedSections?.education,
        }}
        onSaveAsNew={() => {
          setDuplicateErrorModal(null);
          saveCandidateProfile(true);
        }}
        onViewExisting={(id) => {
          setDuplicateErrorModal(null);
          navigate(`/candidates/${id}`);
        }}
        onUpdateExisting={async (id) => {
          setDuplicateErrorModal(null);
          
          try {
            console.log("Updating existing candidate with ID:", id);
            
            // Prepare the complete candidate data from parsed sections
            const updateData = {
              name: parsedName,
              email: parsedEmail,
              phone: parsedPhone,
              summary: parsedSections?.summary,
              skills: parsedSections?.skills || [],
              work_history: parsedSections?.work_experience || [],
              education: parsedSections?.education || [],
              certifications: parsedSections?.certifications || [],
              projects: parsedSections?.projects || [],
              linkedin_url: parsedLinkedin,
              portfolio_url: parsedPortfolio,
              raw_resume_text: rawResumeText,
            };

            console.log("Sending update data:", {
              name: updateData.name,
              email: updateData.email,
              skillsCount: updateData.skills?.length || 0,
              workHistoryCount: updateData.work_history?.length || 0,
              educationCount: updateData.education?.length || 0,
              certificationsCount: updateData.certifications?.length || 0,
              projectsCount: updateData.projects?.length || 0,
            });

            // Call the enhanced update endpoint
            const response = await api.put(`/candidates/${id}/update-full`, updateData);
            
            console.log("Update response:", response.data);
            
            toast.success("Candidate updated successfully with all resume data!");
            
            // Navigate to the updated candidate page
            navigate(`/candidates/${id}`);
            
          } catch (error: any) {
            console.error("Error updating candidate:", error);
            
            if (error.response?.data?.message) {
              toast.error(`Update failed: ${error.response.data.message}`);
            } else {
              toast.error("Failed to update candidate. Please try again.");
            }
            
            // Fallback to manual edit page
            navigate(`/candidates/${id}`);
          }
        }}
      />

      {/* Bulk Upload Duplicate Modal */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Duplicate Candidate Detected</h3>
              <button
                onClick={() => setDuplicateModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900">{duplicateModal.fileName}</p>
                <p className="text-xs text-amber-700 mt-1">{duplicateModal.message}</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Duplicate Field:</strong> {duplicateModal.field}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Existing Candidate:</strong> {duplicateModal.existingCandidateName}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Existing ID:</strong> {duplicateModal.existingCandidateId}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setDuplicateModal(null);
                  navigate(`/candidates/${duplicateModal.existingCandidateId}`);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Existing Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
