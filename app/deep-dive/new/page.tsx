import { DeepDiveForm } from "@/components/DeepDiveForm";

export default function NewDeepDivePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generate a Deep Dive
          </h1>
          <p className="text-gray-600">
            Enter company and role details. We'll analyze public sources and generate a grounded report.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-8">
          <DeepDiveForm />
        </div>
      </div>
    </main>
  );
}
