import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FooterButtons } from "./FooterButtons";

import { Label } from "../../../components/ui/label";
import Input from "../../../components/common/Input";
import { useApplicationContext } from "../context/ApplicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";

const schema = z.object({
  hearAboutUs: z.string(),
  expectedSalary: z.string(),
  currentSalary: z.string(),
  noticePeriod: z.string().min(1, "Notice period is required"),
  willingToRelocate: z.string(),
  willingToTravel: z.string(),
  requiresSponsorship: z.string(),
  yearsOfExperience: z.string(),
  currentEmployer: z.string(),
  reasonForJobChange: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function ApplicationQuestions() {
  const { application, saveSection, nextStep, prevStep } = useApplicationContext();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: application.questions,
  });

  const onSubmit = (values: FormValues) => {
    saveSection("questions", values);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-4xl font-semibold text-slate-800">Application Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm font-semibold text-slate-500">* Indicates a required field</p>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hearAboutUs">How did you hear about this position?</Label>
              <select 
                className="h-11 w-full rounded-xl border border-slate-300 px-3" 
                {...register("hearAboutUs")}
              >
                <option value="">Select</option>
                <option value="linkedin">LinkedIn</option>
                <option value="indeed">Indeed</option>
                <option value="company_website">Company Website</option>
                <option value="referral">Employee Referral</option>
                <option value="job_board">Job Board</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearsOfExperience">Years of Experience</Label>
              <Input {...register("yearsOfExperience")} placeholder="e.g., 5 years" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectedSalary">Expected Salary</Label>
              <Input {...register("expectedSalary")} placeholder="e.g., $80,000 - $100,000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentSalary">Current Salary</Label>
              <Input {...register("currentSalary")} placeholder="e.g., $75,000" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticePeriod">Notice Period <span className="text-red-600">*</span></Label>
              <select 
                className="h-11 w-full rounded-xl border border-slate-300 px-3" 
                {...register("noticePeriod")}
              >
                <option value="">Select</option>
                <option value="immediately">Immediately</option>
                <option value="15_days">15 days</option>
                <option value="30_days">30 days</option>
                <option value="45_days">45 days</option>
                <option value="60_days">60 days</option>
                <option value="90_days">90 days</option>
                <option value="more_than_90_days">More than 90 days</option>
              </select>
              {errors.noticePeriod && (
                <p className="text-xs text-red-600">{errors.noticePeriod.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentEmployer">Current Employer</Label>
              <Input {...register("currentEmployer")} placeholder="Current company name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="willingToRelocate">Willing to Relocate?</Label>
              <select 
                className="h-11 w-full rounded-xl border border-slate-300 px-3" 
                {...register("willingToRelocate")}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="maybe">Maybe</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="willingToTravel">Willing to Travel?</Label>
              <select 
                className="h-11 w-full rounded-xl border border-slate-300 px-3" 
                {...register("willingToTravel")}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="limited">Limited</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiresSponsorship">Requires Visa Sponsorship?</Label>
              <select 
                className="h-11 w-full rounded-xl border border-slate-300 px-3" 
                {...register("requiresSponsorship")}
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_sure">Not sure</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasonForJobChange">Reason for Job Change</Label>
            <Textarea 
              {...register("reasonForJobChange")} 
              placeholder="Please describe why you're looking for a new opportunity..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <FooterButtons onBack={prevStep} />
    </form>
  );
}
