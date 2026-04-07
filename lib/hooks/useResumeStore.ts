"use client";

import { useState, useEffect, useCallback } from "react";

export interface StoredResume {
  text: string;
  fileName: string | null;
  savedAt: string; // ISO string
}

const STORAGE_KEY = "deepdive_resume";

function loadFromStorage(): StoredResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredResume) : null;
  } catch {
    return null;
  }
}

function saveToStorage(resume: StoredResume) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(resume));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useResumeStore() {
  const [stored, setStored] = useState<StoredResume | null>(null);

  useEffect(() => {
    setStored(loadFromStorage());
  }, []);

  const save = useCallback((text: string, fileName: string | null) => {
    const resume: StoredResume = { text, fileName, savedAt: new Date().toISOString() };
    saveToStorage(resume);
    setStored(resume);
  }, []);

  const clear = useCallback(() => {
    clearStorage();
    setStored(null);
  }, []);

  return { stored, save, clear };
}
