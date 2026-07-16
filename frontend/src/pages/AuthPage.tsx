import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import { login, register } from "../services/api/auth";
import { useAuthStore } from "../store/authStore";

import { validateEmail } from "../utils/validation";

type Mode = "login" | "register";

const validatePassword = (value: string) =>
  value.length >= 6 ? null : "Password must be at least 6 characters";

export default function AuthPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [loading, setLoading] = useState(false);

  const errors = useMemo(() => {
    return {
      email: email ? validateEmail(email) : "Email is required",
      password: password ? validatePassword(password) : "Password is required",
    };
  }, [email, password]);

  const isValid = !errors.email && !errors.password;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      if (mode === "register") {
        await register(email, password, role);
      }
      const tokens = await login(email, password);
      setTokens(tokens.access_token, tokens.refresh_token);
      toast.success(mode === "register" ? "Account created" : "Logged in");
      navigate("/upload");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {mode === "login"
            ? "Log in to manage resumes and candidates."
            : "Register to start uploading resumes."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-subtle">
        <div className="flex rounded-xl bg-slate-100 p-1 text-sm font-medium text-slate-600">
          {(["login", "register"] as Mode[]).map((item) => (
            <button
              key={item}
              onClick={() => setMode(item)}
              className={`flex-1 rounded-lg px-3 py-2 transition-all duration-200 ${
                mode === item
                  ? "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:shadow-purple-500/40"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-4">
          <Input
            label="Email"
            placeholder="admin@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email ?? undefined}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password ?? undefined}
          />
          {mode === "register" && (
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1.5 block">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          )}
          <Button
            className="w-full"
            isLoading={loading}
            disabled={!isValid || loading}
            onClick={handleSubmit}
          >
            {mode === "login" ? "Login" : "Create account"}
          </Button>
        </div>
      </div>
    </section>
  );
}
