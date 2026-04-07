import { DeepDiveForm } from "@/components/DeepDiveForm";

export default function NewDeepDivePage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1.5">
            Generate a Deep Dive
          </h1>
          <p className="text-sm text-gray-500">
            Enter company and role details. We'll analyze public sources and generate a grounded report.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <DeepDiveForm />
        </div>
      </div>
    </main>
  );
}
