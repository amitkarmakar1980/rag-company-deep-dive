import { DeepDiveForm } from "@/components/DeepDiveForm";

export default function NewDeepDivePage() {
  return (
    <main className="min-h-screen bg-[#faf8f3]">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#1c1713] mb-1.5">
            Generate a Deep Dive
          </h1>
          <p className="text-sm text-[#7a6d63]">
            Enter company and role details. We'll analyze public sources and generate a grounded report.
          </p>
        </div>

        <DeepDiveForm />
      </div>
    </main>
  );
}
