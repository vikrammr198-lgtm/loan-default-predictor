import type { LoanApplication, PredictionResult } from "./model";

export type HistoryEntry = {
  id: string;
  createdAt: string;
  input: LoanApplication;
  result: PredictionResult;
};

const STORAGE_KEY = "loan-default-predictor:history";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
}

export type Stats = {
  total: number;
  defaults: number;
  nonDefaults: number;
  avgDefaultProbability: number;
};

export function computeStats(entries: HistoryEntry[]): Stats {
  const total = entries.length;
  const defaults = entries.filter((e) => e.result.predictedClass === 0).length;
  const avg =
    total === 0 ? 0 : entries.reduce((s, e) => s + e.result.defaultProbability, 0) / total;
  return { total, defaults, nonDefaults: total - defaults, avgDefaultProbability: avg };
}
