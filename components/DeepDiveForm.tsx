"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1.5";

export function DeepDiveForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"url" | "details">("url");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jdUrl: "",
    companyName: "",
    roleTitle: "",
    companyUrl: "",
    jobDescription: "",
    profileContext: "",
    customUrls: "",
  });
  const [progress, setProgress] = useState<string | null>(null);

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProgress("Fetching job description from the provided URL…");
    setUrlError(null);
    if (!formData.jdUrl || formData.jdUrl.includes("linkedin.com")) {
      setUrlError("Please provide a direct job description URL (not LinkedIn).");
      setLoading(false);
      setProgress(null);
      return;
    }
    try {
      const res = await fetch("/api/deep-dive/extract-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formData.jdUrl }),
      });
      setProgress("Analyzing job description with AI…");
      let data = {};
      if (res.ok) {
        data = await res.json();
      }
      setFormData((prev) => ({ ...prev, ...data, jdUrl: prev.jdUrl }));
      setStep("details");
      setUrlError(res.ok ? null : "Could not extract job details. You can enter them manually.");
      setProgress(null);
    } catch {
      setUrlError("Could not extract job details. You can enter them manually.");
      setStep("details");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/deep-dive/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
      if (!res.ok) throw new Error("Failed to create deep dive");
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
    <>
      {step === "url" && (
        <form onSubmit={handleUrlSubmit} className="space-y-5">
          <div>
            <label className={LABEL_CLASS}>
              Job Description URL <span className="text-gray-400 font-normal">(not LinkedIn)</span>
            </label>
            <input
              type="url"
              required
              value={formData.jdUrl}
              onChange={(e) => setFormData({ ...formData, jdUrl: e.target.value })}
              className={INPUT_CLASS}
              placeholder="Paste the direct JD URL here…"
            />
            {urlError && <p className="text-red-600 text-sm mt-2">{urlError}</p>}
          </div>
          {progress && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span>{progress}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "Fetching…" : "Next →"}
          </button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {urlError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
              {urlError}
            </div>
          )}
          <div>
            <label className={LABEL_CLASS}>Company Name *</label>
            <input
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g., Anthropic"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Role Title *</label>
            <input
              type="text"
              required
              value={formData.roleTitle}
              onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
              className={INPUT_CLASS}
              placeholder="e.g., Senior Product Manager"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Company Website</label>
            <input
              type="url"
              value={formData.companyUrl}
              onChange={(e) => setFormData({ ...formData, companyUrl: e.target.value })}
              className={INPUT_CLASS}
              placeholder="https://company.com"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Job Description</label>
            <textarea
              value={formData.jobDescription}
              onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
              className={INPUT_CLASS}
              rows={4}
              placeholder="Paste the full job description here…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Hiring Manager / Recruiter Profile</label>
            <textarea
              value={formData.profileContext}
              onChange={(e) => setFormData({ ...formData, profileContext: e.target.value })}
              className={INPUT_CLASS}
              rows={3}
              placeholder="Notes about the hiring manager or recruiter…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Additional URLs</label>
            <textarea
              value={formData.customUrls}
              onChange={(e) => setFormData({ ...formData, customUrls: e.target.value })}
              className={INPUT_CLASS}
              rows={3}
              placeholder="One URL per line…"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? "Generating Deep Dive…" : "Generate Deep Dive"}
          </button>
        </form>
      )}
    </>
  );
}
