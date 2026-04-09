"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useResumeStore } from "@/lib/hooks/useResumeStore";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition";

const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1.5";

// ─── Inline Resume Panel ──────────────────────────────────────────────────────

interface ResumePanelProps {
  stored: { text: string; fileName: string | null; savedAt: string } | null;
  onSave: (text: string, fileName: string | null) => void;
  onClear: () => void;
}

function ResumePanel({ stored, onSave, onClear }: ResumePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    setFileName(file.name);
    setFileContent(null);

    const name = file.name.toLowerCase();
    if (name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target?.result as string);
      reader.readAsText(file);
    } else if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc")) {
      // Send to server to extract text, then store as plain text
      setPdfError("Extracting text…");
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/resume/parse", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok || !data.text) {
          setPdfError(data.error ?? "Could not extract text. Try pasting instead.");
        } else {
          setFileContent(data.text);
          setPdfError(null);
          // Auto-save to localStorage once parsed so user doesn't need to click Save
          onSave(data.text, file.name);
          setExpanded(false);
        }
      } catch {
        setPdfError("Could not extract text. Try pasting instead.");
      }
    } else {
      setPdfError("Unsupported file type. Please upload a PDF, Word (.docx/.doc), or .txt file.");
    }
  }, []);

  const handleSave = () => {
    const text = mode === "paste" ? resumeText.trim() : (fileContent ?? "").trim();
    const name = mode === "file" ? fileName : null;
    if (!text) return;
    onSave(text, name);
    setExpanded(false);
    setResumeText("");
    setFileContent(null);
    setFileName(null);
  };

  const hasInput =
    (mode === "paste" && resumeText.trim().length > 50) ||
    (mode === "file" && fileContent !== null && fileContent.trim().length > 50);

  // ── Stored state (resume on file) ─────────────────────────────────────────

  if (stored && !expanded) {
    const savedDate = new Date(stored.savedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-800">
                Resume on file
                {stored.fileName && (
                  <span className="font-normal text-emerald-700 ml-1">· {stored.fileName}</span>
                )}
              </p>
              <p className="text-xs text-emerald-600">Saved {savedDate} · Will be used to personalize your report</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 rounded"
            >
              Replace
            </button>
            <span className="text-emerald-300">·</span>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-emerald-600 hover:text-red-600 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Collapsed CTA (no resume yet) ─────────────────────────────────────────

  if (!expanded) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700">Add your resume <span className="text-gray-400 font-normal">(optional)</span></p>
            <p className="text-xs text-gray-400 mt-0.5">Unlocks personalized candidate match, strengths, concerns, and positioning strategy.</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 px-3.5 py-1.5 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded form ──────────────────────────────────────────────────────────

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Add your resume</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 rounded"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "paste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "file" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === "paste" ? (
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume — full text, LinkedIn About section, or any background summary…"
          rows={8}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 resize-y leading-relaxed"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
            id="form-resume-file-input"
          />
          <label
            htmlFor="form-resume-file-input"
            className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            {fileName && !pdfError ? (
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">{fileName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Click to change</p>
              </div>
            ) : (
              <div className="text-center px-4">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">Click to upload</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, Word (.docx), or TXT</p>
              </div>
            )}
          </label>
          {pdfError && <p className="text-xs text-amber-700 mt-2">{pdfError}</p>}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasInput}
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:opacity-40 transition-colors"
        >
          Save Resume
        </button>
        <p className="text-xs text-gray-400">Saved to your browser only</p>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function DeepDiveForm() {
  const router = useRouter();
  const { stored, save: saveResume, clear: clearResume } = useResumeStore();
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
          // Intentionally NOT sending resumeText — personalization is opt-in
          // on the report page, never automatic
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

          <ResumePanel stored={stored} onSave={saveResume} onClear={clearResume} />

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

          <ResumePanel stored={stored} onSave={saveResume} onClear={clearResume} />

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
