import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useApplicationContext } from "../context/ApplicationContext";
import type {
  CertificationItem,
  EducationItem,
  ExperienceItem,
  LanguageItem,
  ProjectItem,
} from "../types/application";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { SkillsInput } from "./SkillsInput";
import { FooterButtons } from "./FooterButtons";


const experienceSchema = z
  .object({
    id: z.string(),
    jobTitle: z.string(),
    company: z.string().trim().min(1, "Company is required"),
    employmentType: z.string(),
    location: z.string().trim().min(1, "Location is required"),
    country: z.string(),
    state: z.string(),
    city: z.string(),
    startMonth: z.string().trim().min(1, "Start date is required"),
    startYear: z.string(),
    endMonth: z.string().trim().min(1, "End date is required"),
    endYear: z.string(),
    duration: z.string(),
    currentlyWorking: z.boolean(),
    roleDescription: z.string(),
    technologiesUsed: z.string(),
    skillsUsed: z.string(),
  })
  .superRefine((value, context) => {
    if (value.startMonth && value.endMonth && value.endMonth < value.startMonth) {
      context.addIssue({
        code: "custom",
        path: ["endMonth"],
        message: "End date cannot be earlier than Start date",
      });
    }
  });

const educationSchema = z
  .object({
    id: z.string(),
    degree: z.string().trim().min(1, "Degree is required"),
    institution: z.string().trim().min(1, "Institution is required"),
    fieldOfStudy: z.string().trim().min(1, "Field of study is required"),
    startYear: z.string().trim().min(1, "Start date is required"),
    endYear: z.string().trim().min(1, "End date is required"),
    cgpa: z.string(),
    percentage: z.string(),
    description: z.string(),
  })
  .superRefine((value, context) => {
    if (value.startYear && value.endYear && value.endYear < value.startYear) {
      context.addIssue({
        code: "custom",
        path: ["endYear"],
        message: "End date cannot be earlier than Start date",
      });
    }
  });

const formSchema = z.object({
  experiences: z.array(experienceSchema).min(1),
  education: z.array(educationSchema).min(1),
  certifications: z.array(
    z.object({
      id: z.string(),
      certificationName: z.string(),
      organization: z.string(),
      issueDate: z.string(),
      expiryDate: z.string(),
      credentialId: z.string(),
      credentialUrl: z.string(),
    }),
  ),
  projects: z.array(
    z.object({
      id: z.string(),
      projectName: z.string(),
      client: z.string(),
      role: z.string(),
      duration: z.string(),
      technologies: z.string(),
      description: z.string(),
      projectUrl: z.string(),
    }),
  ),
  languages: z.array(
    z.object({
      id: z.string(),
      language: z.string(),
      proficiency: z.string(),
    }),
  ),
});

interface FormValues {
  experiences: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  languages: LanguageItem[];
}

export function ExperienceForm() {
  const { application, saveSection, nextStep, prevStep } = useApplicationContext();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      experiences: application.experiences,
      education: application.education,
      certifications: application.certifications,
      projects: application.projects,
      languages: application.languages,
    },
  });

  const experiences = watch("experiences");
  const education = watch("education");
  const certifications = watch("certifications");
  const projects = watch("projects");
  const languages = watch("languages");

  const onSubmit = (values: FormValues) => {
    saveSection("experiences", values.experiences);
    saveSection("education", values.education);
    saveSection("certifications", values.certifications);
    saveSection("projects", values.projects);
    saveSection("languages", values.languages);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">My Experience</CardTitle>
        </CardHeader>
        <CardContent
         className="space-y-5">
          {experiences.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-start justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Experience {index + 1}</h4>
                {experiences.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "experiences",
                        experiences.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-12">
                <div className="md:col-span-6">
                  <Label>Company <span className="text-red-600">*</span></Label>
                  <Input {...register(`experiences.${index}.company`)} />
                  {errors.experiences?.[index]?.company && (
                    <p className="text-xs text-red-600">{errors.experiences[index]?.company?.message}</p>
                  )}
                </div>
                <div className="md:col-span-6">
                  <Label>Job Title</Label>
                  <Input {...register(`experiences.${index}.jobTitle`)} />
                </div>

                <div className="md:col-span-12">
                  <Label>Location <span className="text-red-600">*</span></Label>
                  <Input {...register(`experiences.${index}.location`)} />
                  {errors.experiences?.[index]?.location && (
                    <p className="text-xs text-red-600">{errors.experiences[index]?.location?.message}</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <Label>Start Date <span className="text-red-600">*</span></Label>
                  <Input type="month" {...register(`experiences.${index}.startMonth`)} />
                  {errors.experiences?.[index]?.startMonth && (
                    <p className="text-xs text-red-600">{errors.experiences[index]?.startMonth?.message}</p>
                  )}
                </div>
                <div className="md:col-span-3">
                  <Label>End Date <span className="text-red-600">*</span></Label>
                  <Input type="month" {...register(`experiences.${index}.endMonth`)} />
                  {errors.experiences?.[index]?.endMonth && (
                    <p className="text-xs text-red-600">{errors.experiences[index]?.endMonth?.message}</p>
                  )}
                </div>
                <div className="md:col-span-6">
                  <Label>Duration</Label>
                  <Input {...register(`experiences.${index}.duration`)} />
                </div>

                <div className="md:col-span-12">
                  <Label>Description</Label>
                  <Textarea {...register(`experiences.${index}.roleDescription`)} />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setValue("experiences", [
                  ...experiences,
                  {
                    id: crypto.randomUUID(),
                    jobTitle: "",
                    company: "",
                    employmentType: "",
                    location: "",
                    country: "",
                    state: "",
                    city: "",
                    startMonth: "",
                    startYear: "",
                    endMonth: "",
                    endYear: "",
                    duration: "",
                    currentlyWorking: false,
                    roleDescription: "",
                    technologiesUsed: "",
                    skillsUsed: "",
                  },
                ])
              }
            >
              Add Another Experience
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {education.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-start justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Education {index + 1}</h4>
                {education.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "education",
                        education.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Degree <span className="text-red-600">*</span></Label>
                  <Input {...register(`education.${index}.degree`)} />
                  {errors.education?.[index]?.degree && (
                    <p className="text-xs text-red-600">{errors.education[index]?.degree?.message}</p>
                  )}
                </div>
                <div>
                  <Label>Institution <span className="text-red-600">*</span></Label>
                  <Input {...register(`education.${index}.institution`)} />
                  {errors.education?.[index]?.institution && (
                    <p className="text-xs text-red-600">{errors.education[index]?.institution?.message}</p>
                  )}
                </div>

                <div>
                  <Label>Field of Study <span className="text-red-600">*</span></Label>
                  <Input {...register(`education.${index}.fieldOfStudy`)} />
                  {errors.education?.[index]?.fieldOfStudy && (
                    <p className="text-xs text-red-600">{errors.education[index]?.fieldOfStudy?.message}</p>
                  )}
                </div>
                <div>
                  <Label>GPA / Percentage</Label>
                  <Input {...register(`education.${index}.cgpa`)} />
                </div>

                <div>
                  <Label>Start Date <span className="text-red-600">*</span></Label>
                  <Input type="date" {...register(`education.${index}.startYear`)} />
                  {errors.education?.[index]?.startYear && (
                    <p className="text-xs text-red-600">{errors.education[index]?.startYear?.message}</p>
                  )}
                </div>
                <div>
                  <Label>End Date <span className="text-red-600">*</span></Label>
                  <Input type="date" {...register(`education.${index}.endYear`)} />
                  {errors.education?.[index]?.endYear && (
                    <p className="text-xs text-red-600">{errors.education[index]?.endYear?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("education", [
                ...education,
                {
                  id: crypto.randomUUID(),
                  degree: "",
                  institution: "",
                  fieldOfStudy: "",
                  startYear: "",
                  endYear: "",
                  cgpa: "",
                  percentage: "",
                  description: "",
                },
              ])
            }
          >
            Add Education
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <SkillsInput
            label="Skills"
            values={application.skills}
            onChange={(values) => saveSection("skills", values)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">Certifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {certifications.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Certification {index + 1}</h4>
                {certifications.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "certifications",
                        certifications.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Certification Name</Label><Input {...register(`certifications.${index}.certificationName`)} /></div>
                <div><Label>Organization</Label><Input {...register(`certifications.${index}.organization`)} /></div>
                <div><Label>Issue Date</Label><Input type="month" {...register(`certifications.${index}.issueDate`)} /></div>
                <div><Label>Expiry Date</Label><Input type="month" {...register(`certifications.${index}.expiryDate`)} /></div>
                <div><Label>Credential ID</Label><Input {...register(`certifications.${index}.credentialId`)} /></div>
                <div><Label>Credential URL</Label><Input type="url" {...register(`certifications.${index}.credentialUrl`)} /></div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("certifications", [
                ...certifications,
                {
                  id: crypto.randomUUID(),
                  certificationName: "",
                  organization: "",
                  issueDate: "",
                  expiryDate: "",
                  credentialId: "",
                  credentialUrl: "",
                },
              ])
            }
          >
            Add Certification
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {projects.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Project {index + 1}</h4>
                {projects.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "projects",
                        projects.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Project Name</Label><Input {...register(`projects.${index}.projectName`)} /></div>
                <div><Label>Client</Label><Input {...register(`projects.${index}.client`)} /></div>
                <div><Label>Role</Label><Input {...register(`projects.${index}.role`)} /></div>
                <div><Label>Duration</Label><Input {...register(`projects.${index}.duration`)} /></div>
                <div><Label>Technologies</Label><Input {...register(`projects.${index}.technologies`)} /></div>
                <div><Label>Project URL</Label><Input type="url" {...register(`projects.${index}.projectUrl`)} /></div>
                <div className="sm:col-span-2"><Label>Description</Label><Textarea {...register(`projects.${index}.description`)} /></div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("projects", [
                ...projects,
                {
                  id: crypto.randomUUID(),
                  projectName: "",
                  client: "",
                  role: "",
                  duration: "",
                  technologies: "",
                  description: "",
                  projectUrl: "",
                },
              ])
            }
          >
            Add Project
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">Languages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {languages.map((item, index) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900">Language {index + 1}</h4>
                {languages.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setValue(
                        "languages",
                        languages.filter((entry) => entry.id !== item.id),
                      )
                    }
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Language</Label><Input {...register(`languages.${index}.language`)} /></div>
                <div>
                  <Label>Proficiency</Label>
                  <select className="h-11 w-full rounded-md border border-slate-400 px-3" {...register(`languages.${index}.proficiency`)}>
                    <option value="">Select</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Fluent">Fluent</option>
                    <option value="Native">Native</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setValue("languages", [
                ...languages,
                { id: crypto.randomUUID(), language: "", proficiency: "" },
              ])
            }
          >
            Add Language
          </Button>
        </CardContent>
      </Card>

      <FooterButtons onBack={prevStep} />
    </form>
  );
}