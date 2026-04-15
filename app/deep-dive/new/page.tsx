import { DeepDiveForm } from "@/components/DeepDiveForm";

export default function NewDeepDivePage() {
  return (
    <main className="min-h-screen bg-[#faf8f3]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1c1713] mb-1.5">
            Generate a Deep Dive
          </h1>
          <p className="text-sm text-[#7a6d63]">
            Enter company and role details. We'll analyze public sources and generate a grounded report.
          </p>
        </div>

        <div className="bg-white border border-[#e4ddd4] rounded-xl p-8 shadow-[0_2px_12px_rgba(28,23,19,0.06)]">
          <DeepDiveForm />
        </div>
      </div>
    </main>
  );
}
