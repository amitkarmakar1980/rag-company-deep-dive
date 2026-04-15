"use client";

import { useState, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/hooks/useResumeStore";

interface StoredResume {
  text: string;
  fileName: string | null;
  savedAt: string;
}

interface ResumeUploadPanelProps {
  requestId: string;
  /** Called after the upload succeeds. Receives the returned overlayId. */
  onUploaded: (overlayId: string) => void;
  /** Resume already saved in localStorage, if any */
  storedResume?: StoredResume | null;
}

type UploadState = "idle" | "uploading" | "error";

export function ResumeUploadPanel({ requestId, onUploaded, storedResume }: ResumeUploadPanelProps) {
  const { save: saveToLocalStorage } = useResumeStore();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBinaryFile = (name: string) =>
    name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileContent(null);
    setResumeText("");
    // Binary files (PDF/Word) are sent as FormData; txt is read client-side
    if (!isBinaryFile(file.name)) {
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target?.result as string);
      reader.readAsText(file);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    const textToSend = mode === "paste" ? resumeText : fileContent;
    const isBinary = mode === "file" && fileName !== null && isBinaryFile(fileName);

    if (!isBinary && !textToSend?.trim()) {
      setErrorMessage("Please enter or upload your resume.");
      return;
    }

    setUploadState("uploading");
    setErrorMessage(null);

    try {
      let res: Response;

      if (isBinary && fileInputRef.current?.files?.[0]) {
        const form = new FormData();
        form.append("requestId", requestId);
        form.append("resumeFile", fileInputRef.current.files[0]);
        res = await fetch("/api/resume/upload", { method: "POST", credentials: "include", body: form });
      } else {
        res = await fetch("/api/resume/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ requestId, resumeText: textToSend }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const responseData = await res.json();
      const { overlayId } = responseData;

      // Persist resume to localStorage so future sessions/forms remember it
      const savedText = responseData.resumeText ?? (mode === "paste" ? resumeText : fileContent) ?? null;
      if (savedText) {
        saveToLocalStorage(savedText, mode === "file" ? fileName : null);
      }

      onUploaded(overlayId);
    } catch (err) {
      setUploadState("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    }
  };

  const hasInput =
    (mode === "paste" && resumeText.trim().length > 50) ||
    (mode === "file" && fileName !== null && (isBinaryFile(fileName) || (fileContent ?? "").trim().length > 50));

  // Stored resume: one-click direct submit without expanding the form
  if (!expanded && storedResume) {
    const savedDate = new Date(storedResume.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const handleUseStored = async () => {
      setUploadState("uploading");
      setErrorMessage(null);
      try {
        const res = await fetch("/api/resume/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ requestId, resumeText: storedResume.text }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Upload failed");
        }
        const { overlayId } = await res.json();
        onUploaded(overlayId);
      } catch (err) {
        setUploadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed. Please try again.");
      }
    };

    return (
      <div className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-5" role="region" aria-label="Personalize report">
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0ece4] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#7a6d63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1c1713] mb-0.5">
              Personalize with your resume
              {storedResume.fileName && (
                <span className="font-normal text-[#7a6d63] ml-1">· {storedResume.fileName}</span>
              )}
            </p>
            <p className="text-sm text-[#7a6d63] leading-relaxed">
              Saved {savedDate}. Generate candidate-role matching, interviewer concerns, and positioning strategy tailored to you.
            </p>
            {errorMessage && <p className="text-xs text-red-600 mt-1">{errorMessage}</p>}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={handleUseStored}
              disabled={uploadState === "uploading"}
              className="inline-flex items-center gap-1.5 bg-[#1a4a3a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#153d30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 disabled:opacity-40 transition-colors"
            >
              {uploadState === "uploading" ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
                  Generating…
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Personalize
                </>
              )}
            </button>
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-[#9c8d81] hover:text-[#6b5e52] underline underline-offset-2 transition-colors"
            >
              Use a different resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!expanded) {

    return (
      <div
        className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-5"
        role="region"
        aria-label="Resume upload CTA"
      >
        <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#f0ece4] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#7a6d63]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1c1713] mb-0.5">
              Personalize this report with your background
            </p>
            <p className="text-sm text-[#7a6d63] leading-relaxed">
              Upload your resume to unlock candidate-role matching, positioning strategy, interviewer concerns, and story recommendations tailored to you.
            </p>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-[#1a4a3a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#153d30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 transition-colors"
            aria-expanded={false}
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

  return (
    <div
      className="bg-white border border-[#e4ddd4] rounded-xl px-6 py-5 space-y-4"
      role="region"
      aria-label="Resume upload form"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#1c1713]">Upload your resume</p>
          <p className="text-xs text-[#9c8d81] mt-0.5">
            Your resume is used only for this analysis and is not stored beyond this session.
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-[#9c8d81] hover:text-[#6b5e52] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 rounded"
          aria-label="Close upload panel"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-[#f0ece4] rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode("paste")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "paste"
              ? "bg-white text-[#1c1713] shadow-sm"
              : "text-[#7a6d63] hover:text-[#4a3f36]"
          }`}
        >
          Paste text
        </button>
        <button
          onClick={() => setMode("file")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            mode === "file"
              ? "bg-white text-[#1c1713] shadow-sm"
              : "text-[#7a6d63] hover:text-[#4a3f36]"
          }`}
        >
          Upload file
        </button>
      </div>

      {/* Input area */}
      {mode === "paste" ? (
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume here — full text, LinkedIn about section, or any background summary..."
          rows={10}
          className="w-full border border-[#d4cdc4] rounded-lg px-3 py-2.5 text-sm text-[#1c1713] placeholder:text-[#9c8d81] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 resize-y leading-relaxed"
          aria-label="Resume text"
        />
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
            id="resume-file-input"
            aria-label="Upload resume file"
          />
          <label
            htmlFor="resume-file-input"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#d4cdc4] rounded-lg cursor-pointer hover:border-gray-400 hover:bg-[#f5f1e8] transition-colors"
          >
            {fileName ? (
              <div className="text-center">
                <svg className="mx-auto w-6 h-6 text-[#7a6d63] mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-[#4a3f36]">{fileName}</p>
                <p className="text-xs text-[#9c8d81] mt-0.5">Click to change</p>
              </div>
            ) : (
              <div className="text-center">
                <svg className="mx-auto w-6 h-6 text-[#9c8d81] mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-[#7a6d63]">
                  <span className="font-medium text-[#4a3f36]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-[#9c8d81] mt-0.5">PDF, Word (.docx), or TXT · max 5MB</p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <p className="text-sm text-red-600" role="alert">{errorMessage}</p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!hasInput || uploadState === "uploading"}
          className="inline-flex items-center gap-2 bg-[#1a4a3a] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#153d30] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4a3a]/40 disabled:opacity-40 transition-colors"
          aria-label="Generate personalized analysis"
        >
          {uploadState === "uploading" ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
              Analyzing…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Personalized Analysis
            </>
          )}
        </button>
        <p className="text-xs text-[#9c8d81]">Personalization starts right after upload</p>
      </div>
    </div>
  );
}
