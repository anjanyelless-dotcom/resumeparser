import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, className = "", ...rest }, ref) => {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {label && <span className="mb-1.5 block">{label}</span>}
        <input
          ref={ref}
          className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${error ? "border-red-400 focus:border-red-500 focus:ring-red-200" : ""} ${className}`}
          {...rest}
        />
        {helperText && !error && (
          <span className="mt-1 block text-xs text-slate-500">
            {helperText}
          </span>
        )}
        {error && (
          <span className="mt-1 block text-xs text-red-500">{error}</span>
        )}
      </label>
    );
  },
);

Input.displayName = "Input";

export default Input;
