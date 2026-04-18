"use client";

import { useState, useRef, useCallback } from "react";
import { ResumeProfileIcon } from "@/components/ResumeProfileIcon";
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
      <div className="border border-[#22d3ee]/25 bg-[#22d3ee]/8 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <ResumeProfileIcon
            containerClassName="w-8 h-8 rounded-lg bg-[#22d3ee]/15 flex items-center justify-center flex-shrink-0"
            cardClassName="relative h-[18px] w-[14px] rounded-[5px] border border-[#66d7ea]/45 bg-[#0f172a] shadow-[0_1px_3px_rgba(8,15,37,0.32)]"
            lineClassName="bg-[#6dd3eb]/45"
            photoFrameClassName="absolute left-[2px] top-[2px] h-[7px] w-[7px] overflow-hidden rounded-[3px] border border-[#67e8f9]/45"
            photoBackgroundClassName="absolute inset-0 bg-[linear-gradient(180deg,#10394a_0%,#1d5f77_100%)]"
            photoHeadClassName="absolute left-1/2 top-[1px] h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-[#9be7f3]"
            photoBodyClassName="absolute bottom-0 left-1/2 h-[4px] w-[5px] -translate-x-1/2 rounded-t-full bg-[#67e8f9]"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Resume saved
              {stored.fileName && <span className="font-normal ml-1 text-[#22d3ee]/80 truncate">· {stored.fileName}</span>}
            </p>
            <p className="text-xs text-[#7b82a0]">Saved {savedDate} · Used automatically when you generate a deep dive</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setExpanded(true)} className="text-sm font-medium text-[#22d3ee] hover:text-white underline underline-offset-2 transition-colors">
            Replace
          </button>
          <button onClick={clear} className="text-sm font-medium text-[#7b82a0] hover:text-rose-400 underline underline-offset-2 transition-colors">
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="border border-dashed border-white/15 bg-white/4 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#e2e4ef]">
            Add your resume <span className="text-[#4b5280] font-normal">(optional)</span>
          </p>
          <p className="text-sm text-[#7b82a0] mt-0.5">
            Get a personalized candidate match, interviewer concerns, and positioning strategy alongside every deep dive.
          </p>
        </div>
        <button
          onClick={() => setExpanded(true)}
          className="flex-shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-[#6d28d9] to-[#4338ca] text-white text-sm font-medium px-4 py-2 rounded-lg hover:from-[#7c3aed] hover:to-[#4f46e5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/50 transition-all shadow-[0_2px_12px_rgba(109,40,217,0.35)]"
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
    <div className="border border-white/10 bg-white/4 rounded-xl px-5 py-5 space-y-4 shadow-[0_2px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[#e2e4ef]">Upload your resume</p>
          <p className="text-xs text-[#4b5280] mt-0.5">Saved to your browser. Used to personalize every report you generate.</p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-[#4b5280] hover:text-[#e2e4ef] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/30 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 bg-white/6 rounded-lg p-1 w-fit">
        {(["paste", "file"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === m ? "bg-white/15 text-[#e2e4ef] shadow-sm" : "text-[#7b82a0] hover:text-[#e2e4ef]"
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
          className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2.5 text-sm text-[#e2e4ef] placeholder:text-[#4b5280] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1]/40 focus:border-[#6366f1]/40 resize-y leading-relaxed"
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
            className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/12 rounded-lg cursor-pointer hover:border-[#6366f1]/50 hover:bg-white/4 transition-colors"
          >
            {fileName ? (
              <div className="text-center">
                <p className="text-sm font-medium text-[#e2e4ef]">{fileName}</p>
                <p className="text-xs text-[#4b5280] mt-0.5">Click to change</p>
              </div>
            ) : (
              <div className="text-center px-4">
                <p className="text-sm text-[#7b82a0]">
                  <span className="font-medium text-[#a5b4fc]">Click to upload</span>
                </p>
                <p className="text-xs text-[#4b5280] mt-0.5">PDF, Word (.docx), or TXT</p>
              </div>
            )}
          </label>
        </div>
      )}

      {fileError && (
        <p className={`text-xs mt-1 ${fileError === "Extracting text…" ? "text-[#4b5280]" : "text-amber-400"}`}>
          {fileError}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasInput}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#6d28d9] to-[#4338ca] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:from-[#7c3aed] hover:to-[#4f46e5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/50 disabled:opacity-40 transition-all shadow-[0_2px_12px_rgba(109,40,217,0.35)]"
        >
          Save Resume
        </button>
        <p className="text-xs text-[#4b5280]">Saved locally in your browser only</p>
      </div>
    </div>
  );
}
