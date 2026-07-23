import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Label } from "../../../components/ui/label";
import { FooterButtons } from "./FooterButtons";
import { useApplicationContext } from "../context/ApplicationContext";
import Input from "../../../components/common/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

const schema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("Enter a valid email").min(1, "Email address is required"),
  mobile: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(/^[0-9()+\-\s]{7,20}$/, "Enter a valid phone number"),
  linkedIn: z.string(),
  portfolio: z.string(),
});

type FormValues = z.infer<typeof schema>;

export function PersonalInfoForm() {
  const { application, saveSection, nextStep, prevStep } = useApplicationContext();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: application.personalInfo.firstName,
      lastName: application.personalInfo.lastName,
      email: application.personalInfo.email,
      mobile: application.personalInfo.mobile || application.personalInfo.phone,
      linkedIn: application.personalInfo.linkedIn,
      portfolio: application.personalInfo.portfolio,
    },
  });

  const onSubmit = (values: FormValues) => {
    saveSection("personalInfo", {
      ...application.personalInfo,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.mobile,
      mobile: values.mobile,
      linkedIn: values.linkedIn,
      portfolio: values.portfolio,
    });
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl">
      <Card
      >
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-slate-800">My Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Personal Information</h3>
            <div className="grid gap-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-6">
                <Label htmlFor="firstName">First Name <span className="text-red-600">*</span></Label>
                <Input id="firstName" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-6">
                <Label htmlFor="lastName">Last Name <span className="text-red-600">*</span></Label>
                <Input id="lastName" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-10">
              <div className="space-y-2 md:col-span-6">
                <Label htmlFor="email">Email Address <span className="text-red-600">*</span></Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="mobile">Phone Number <span className="text-red-600">*</span></Label>
                <Input id="mobile" type="tel" {...register("mobile")} placeholder="+1 9999999999" />
                {errors.mobile && <p className="text-xs text-red-600">{errors.mobile.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Online Profiles</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="linkedIn">LinkedIn URL</Label>
                <Input id="linkedIn" type="url" {...register("linkedIn")} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="portfolio">Portfolio / Website</Label>
                <Input id="portfolio" type="url" {...register("portfolio")} />
              </div>
            </div>
          </section>
        </CardContent>
      </Card>

      <FooterButtons onBack={prevStep} />
    </form>
  );
}