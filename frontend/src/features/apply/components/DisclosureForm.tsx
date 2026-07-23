import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";

import { useApplicationContext } from "../context/ApplicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Checkbox } from "../../../components/ui/checkbox";
import { Label } from "../../../components/ui/label";
import { FooterButtons } from "./FooterButtons";

const schema = z.object({
  acceptedPrivacyNotice: z.boolean().refine((value) => value, "Privacy notice must be accepted"),
  agreedToTerms: z.boolean().refine((value) => value, "You must agree to terms"),
  gender: z.string().min(1, "Gender is required"),
  veteranStatus: z.string().min(1, "Veteran status is required"),
  disabilityStatus: z.string().min(1, "Disability status is required"),
  ethnicity: z.string().min(1, "Ethnicity is required"),
});

type FormValues = z.infer<typeof schema>;

export function DisclosureForm() {
  const { application, saveSection, nextStep, prevStep } = useApplicationContext();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: application.disclosures || {
      acceptedPrivacyNotice: false,
      agreedToTerms: false,
      gender: "",
      veteranStatus: "",
      disabilityStatus: "",
      ethnicity: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    saveSection("disclosures", values);
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-4xl font-semibold text-slate-800">Voluntary Disclosures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm font-semibold text-slate-500">* Indicates a required field</p>
          <section className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <h4 className="mb-2 font-semibold text-slate-800">Privacy Notice</h4>
            <p>
              By proceeding, you confirm that the information provided is accurate and can be
              processed for recruitment purposes. This UI demonstrates frontend-only state flow.
            </p>
          </section>

          <label className="flex items-center gap-3">
            <Controller
              name="acceptedPrivacyNotice"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-sm text-slate-700">I have read the privacy notice</span>
          </label>
          {errors.acceptedPrivacyNotice && (
            <p className="text-xs text-red-600">{errors.acceptedPrivacyNotice.message}</p>
          )}

          <label className="flex items-center gap-3">
            <Controller
              name="agreedToTerms"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <span className="text-sm text-slate-700">I agree to terms and conditions</span>
          </label>
          {errors.agreedToTerms && (
            <p className="text-xs text-red-600">{errors.agreedToTerms.message}</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Gender</Label>
              <select className="h-11 w-full rounded-xl border border-slate-300 px-3" {...register("gender")}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender && <p className="text-xs text-red-600">{errors.gender.message}</p>}
            </div>
            <div>
              <Label>Veteran Status</Label>
              <select
                className="h-11 w-full rounded-xl border border-slate-300 px-3"
                {...register("veteranStatus")}
              >
                <option value="">Select</option>
                <option value="Not a Veteran">Not a Veteran</option>
                <option value="Veteran">Veteran</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.veteranStatus && (
                <p className="text-xs text-red-600">{errors.veteranStatus.message}</p>
              )}
            </div>
            <div>
              <Label>Disability Status</Label>
              <select
                className="h-11 w-full rounded-xl border border-slate-300 px-3"
                {...register("disabilityStatus")}
              >
                <option value="">Select</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.disabilityStatus && (
                <p className="text-xs text-red-600">{errors.disabilityStatus.message}</p>
              )}
            </div>
            <div>
              <Label>Ethnicity</Label>
              <select className="h-11 w-full rounded-xl border border-slate-300 px-3" {...register("ethnicity")}>
                <option value="">Select</option>
                <option value="Asian">Asian</option>
                <option value="Black">Black</option>
                <option value="Hispanic">Hispanic</option>
                <option value="White">White</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.ethnicity && <p className="text-xs text-red-600">{errors.ethnicity.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <FooterButtons onBack={prevStep} />
    </form>
  );
}