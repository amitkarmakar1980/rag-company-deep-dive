"use client";

import { useState, useRef, useCallback } from "react";
import { useResumeStore } from "@/lib/hooks/useResumeStore";

export function HomepageResumePanel() {
  const { stored, save, clear } = useResumeStore();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileContent(null);
    setFileError(null);

    const name = file.name.toLowerCase();
    if (name.endsWith(".txt")) {
      const reader = new FileReader();
      reader.onload = (ev) => setFileContent(ev.target?.result as string);
      reader.readAsText(file);
    } else if (name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc")) {
      setFileError("Extracting text…");
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/resume/parse", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok || !data.text) {
          setFileError(data.error ?? "Could not extract text. Try pasting instead.");
        } else {
          setFileContent(data.text);
          setFileError(null);
        }
      } catch {
        setFileError("Could not extract text. Try pasting instead.");
      }
    } else {
      setFileError("Unsupported file type. Please upload a PDF, Word (.docx/.doc), or .txt file.");
    }
  }, []);

  const handleSave = () => {
    const text = mode === "paste" ? resumeText.trim() : (fileContent ?? "").trim();
    if (!text) return;
    save(text, mode === "file" ? fileName : null);
    setExpanded(false);
    setResumeText("");
    setFileContent(null);
    setFileName(null);
  };

  const hasInput =
    (mode === "paste" && resumeText.trim().length > 50) ||
    (mode === "file" && fileContent !== null && fileContent.trim().length > 50);

  if (stored && !expanded) {
    const savedDate = new Date(stored.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Resume saved
              {stored.fileName && <span className="font-normal ml-1 text-emerald-700">· {stored.fileName}</span>}
            </p>
            <p className="text-xs text-emerald-600">Saved {savedDate} · Used automatically when you generate a deep dive</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(true)} className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2">
            Replace
          </button>
          <button onClick={clear} className="text-sm font-medium text-emerald-600 hover:text-red-600 underline underline-offset-2">
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Add your resume <span className="text-gray-400 font-normal">(optional)</span>
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Get a personalized candidate match, interviewer concerns, and positioning strategy alongside every deep dive.
          </p>
        </div>
        <button
          onClick={() => setExpanded(true)}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Resume
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Upload your resume</p>
          <p className="text-xs text-gray-400 mt-0.5">Saved to your browser. Used to personalize every report you generate.</p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-400 hover:text-gray-600 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["paste", "file"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {m === "paste" ? "Paste text" : "Upload file"}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume — full text, LinkedIn About section, or any background summary…"
          rows={9}
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
            id="homepage-resume-input"
          />
          <label
            htmlFor="homepage-resume-input"
            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
          >
            {fileName ? (
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
        </div>
      )}

      {fileError && (
        <p className={`text-xs mt-1 ${fileError === "Extracting text…" ? "text-gray-400" : "text-amber-700"}`}>
          {fileError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasInput}
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 disabled:opacity-40 transition-colors"
        >
          Save Resume
        </button>
        <p className="text-xs text-gray-400">Saved locally in your browser only</p>
      </div>
    </div>
  );
}
