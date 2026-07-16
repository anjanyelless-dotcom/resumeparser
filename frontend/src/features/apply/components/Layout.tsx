import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

import { useApplicationContext } from "../context/ApplicationContext";
import { ProgressStepper } from "./ProgressStepper";

export function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const { currentStep } = useApplicationContext();

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-[1080px] px-4 py-0 sm:px-6">
        <section className="border border-slate-200 bg-white shadow-sm">
          <div className="px-7 pt-8 sm:px-8">
            <p className="text-base font-semibold text-brand-600">&larr; <span className="underline">Back to Job Posting</span></p>
            <h2 className="mt-3 text-[40px] font-medium text-slate-800">Associate Manager Infrastructure Services</h2>
          </div>
          <ProgressStepper />
          <div className="px-4 pb-6 sm:px-8 md:px-12 lg:px-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}