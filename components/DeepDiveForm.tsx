"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeepDiveForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    roleTitle: "",
    companyUrl: "",
    jobDescription: "",
    profileContext: "",
    customUrls: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/deep-dive/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: formData.companyName,
          roleTitle: formData.roleTitle,
          companyUrl: formData.companyUrl || undefined,
          jobDescription: formData.jobDescription || undefined,
          profileContext: formData.profileContext || undefined,
          customUrls: formData.customUrls
            ? formData.customUrls.split("\n").filter((u) => u.trim())
            : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create deep dive");
      }

      const data = await res.json();
      router.push(`/deep-dive/${data.requestId}`);
    } catch (error) {
      console.error("Error:", error);
      alert(error instanceof Error ? error.message : "Failed to create deep dive");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          required
          value={formData.companyName}
          onChange={(e) =>
            setFormData({ ...formData, companyName: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="e.g., Anthropic"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role Title *
        </label>
        <input
          type="text"
          required
          value={formData.roleTitle}
          onChange={(e) =>
            setFormData({ ...formData, roleTitle: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="e.g., Senior Product Manager"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Website
        </label>
        <input
          type="url"
          value={formData.companyUrl}
          onChange={(e) =>
            setFormData({ ...formData, companyUrl: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          placeholder="https://company.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Description
        </label>
        <textarea
          value={formData.jobDescription}
          onChange={(e) =>
            setFormData({ ...formData, jobDescription: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          rows={4}
          placeholder="Paste the full job description here..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hiring Manager / Recruiter Profile
        </label>
        <textarea
          value={formData.profileContext}
          onChange={(e) =>
            setFormData({ ...formData, profileContext: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          rows={3}
          placeholder="Notes about the hiring manager or recruiter..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Additional URLs
        </label>
        <textarea
          value={formData.customUrls}
          onChange={(e) =>
            setFormData({ ...formData, customUrls: e.target.value })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          rows={3}
          placeholder="One URL per line..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400 transition"
      >
        {loading ? "Generating Deep Dive..." : "Generate Deep Dive"}
      </button>
    </form>
  );
}
