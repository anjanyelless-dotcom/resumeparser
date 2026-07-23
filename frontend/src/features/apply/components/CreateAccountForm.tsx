import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { useApplicationContext } from "../context/ApplicationContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import Input from "../../../components/common/Input";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { login, register as registerUser } from "../../../services/api/auth";
import { useAuthStore } from "../../../store/useAuthStore";
import toast from "react-hot-toast";

const schema = z
  .object({
    email: z.email("Error: Please enter a valid email"),
    password: z
      .string()
      .min(1, "Error: Please enter your password")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Error: Please verify your password"),
    agreedToTerms: z.boolean().refine((value) => value === true, "Please accept Terms & Conditions and Privacy Policy"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Error: Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

export function CreateAccountForm() {
  const { application, saveSection, nextStep } = useApplicationContext();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: application.account,
  });

  const onSubmit = async (values: FormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Checkbox value:", values.agreedToTerms, "Type:", typeof values.agreedToTerms);
    console.log("Validation passed - proceeding with submission");
    setIsLoading(true);
    
    try {
      // Try to register the user first
      try {
        console.log("Attempting to register user...");
        const registerResponse = await registerUser(values.email, values.password, 'candidate');
        console.log("Registration successful:", registerResponse);
        
        // Registration successful - set auth state
        setAuth({
          user: registerResponse.user,
          token: registerResponse.token,
          isAuthenticated: true,
        });
        
        toast.success("Account created successfully!");
        
        // Save account info to application context
        saveSection("account", values);
        nextStep();
        
      } catch (registerError: any) {
        // If registration fails because user already exists, try login
        if (registerError.response?.status === 409) {
          try {
            const loginResponse = await login(values.email, values.password);
            
            // For login, we need to get user info separately since login only returns tokens
            // Create a basic user object from email for now
            const user = {
              id: values.email, // temporary ID
              email: values.email,
              name: values.email.split('@')[0],
              role: 'candidate',
            };
            
            // Login successful - set auth state
            setAuth({
              user,
              token: loginResponse.access_token,
              isAuthenticated: true,
            });
            
            toast.success("Logged in successfully!");
            
            // Save account info to application context
            saveSection("account", values);
            nextStep();
            
          } catch (loginError: any) {
            toast.error(loginError.response?.data?.error || "Login failed. Please check your credentials.");
          }
        } else {
          toast.error(registerError.response?.data?.error || "Registration failed. Please try again.");
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit, (errors) => {
        console.log("Form validation errors:", errors);
        
        // Show specific error messages
        if (errors.email) {
          toast.error(`Email error: ${errors.email.message}`);
        } else if (errors.password) {
          toast.error(`Password error: ${errors.password.message}`);
        } else if (errors.confirmPassword) {
          toast.error(`Password confirmation error: ${errors.confirmPassword.message}`);
        } else if (errors.agreedToTerms) {
          toast.error(`Terms error: ${errors.agreedToTerms.message}`);
        } else {
          toast.error("Please fix all form errors before submitting");
        }
      })} 
      className="mx-auto max-w-4xl"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-4xl font-semibold text-slate-800">Create Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="mx-auto max-w-md">
            <p className="mb-1 text-sm font-semibold text-slate-700">Password Requirements:</p>
            <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>At least 6 characters long</li>
              <li>Must match confirmation password</li>
            </ul>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address <span className="text-red-600">*</span></Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-red-600">*</span></Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className={errors.password ? "border-red-500 pr-10 focus-visible:ring-red-300" : "pr-10"}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Verify New Password <span className="text-red-600">*</span></Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    className={errors.confirmPassword ? "border-red-500 pr-10 focus-visible:ring-red-300" : "pr-10"}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label="Toggle verify password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              <p className="text-sm leading-relaxed text-slate-700">
                By creating an account, you agree to the collection and processing of your personal information for recruitment purposes in accordance with the
                <a href="#" className="mx-1 text-brand-600 underline">Lakshya Technologies Applicant Privacy Notice</a>
                and
                <a href="#" className="mx-1 text-brand-600 underline">Privacy Policy</a>.
              </p>

              <Controller
                name="agreedToTerms"
                control={control}
                rules={{ required: "Please accept Terms & Conditions and Privacy Policy" }}
                render={({ field }) => (
                  <label className="flex items-start gap-3 pt-0.5">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <span className="text-sm leading-tight text-slate-700">I have read and agree to the Terms &amp; Conditions and Privacy Policy.</span>
                  </label>
                )}
              />
              {errors.agreedToTerms && (
                <p className="text-xs text-red-600">{errors.agreedToTerms.message}</p>
              )}

              <div className="mt-3 flex justify-end gap-3 border-t border-slate-200 pt-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    console.log("Current form values:", {
                      email: "test@example.com",
                      password: "password123",
                      confirmPassword: "password123",
                      agreedToTerms: true
                    });
                    console.log("Current errors:", errors);
                  }}
                >
                  Debug Info
                </Button>
                <Button type="submit" className="min-w-48" size="lg" disabled={isLoading}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}