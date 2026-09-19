import jsPDF from "jspdf";

import { CATEGORICAL_FEATURES, NUMERIC_FEATURES } from "./model";
import type { HistoryEntry } from "./history";

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function fieldRows(entry: HistoryEntry): [string, string][] {
  const input = entry.input as unknown as Record<string, string | number>;
  return [
    ...NUMERIC_FEATURES.map(
      (f) => [`${f.label} (${f.unit})`, String(input[f.key])] as [string, string],
    ),
    ...CATEGORICAL_FEATURES.map((f) => [f.label, String(input[f.key])] as [string, string]),
  ];
}

export function downloadPredictionPdf(entry: HistoryEntry) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const isDefault = entry.result.predictedClass === 0;

  doc.setFillColor(30, 64, 140);
  doc.rect(0, 0, 595, 92, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Loan Default Prediction Report", 40, 46);
  doc.setFontSize(10);
  doc.text(`Generated ${new Date(entry.createdAt).toLocaleString()}`, 40, 68);

  doc.setTextColor(20, 24, 40);
  doc.setFontSize(14);
  doc.text("Decision Summary", 40, 130);
  doc.setFontSize(11);

  const summary: [string, string][] = [
    ["Loan Status", isDefault ? "HIGH RISK - Default predicted" : "LOW RISK - No default predicted"],
    ["Predicted Class (Repayment)", String(entry.result.predictedClass)],
    ["Default Probability", pct(entry.result.defaultProbability)],
    ["Repayment Probability", pct(entry.result.repaymentProbability)],
    ["Risk Level", entry.result.riskLevel],
    ["Confidence Score", pct(entry.result.confidence)],
    ["Model Test Accuracy", pct(entry.result.modelAccuracy)],
  ];

  let y = 152;
  for (const [k, v] of summary) {
    doc.text(k, 48, y);
    doc.text(v, 300, y);
    y += 20;
  }

  y += 16;
  doc.setFontSize(14);
  doc.text("Applicant Inputs", 40, y);
  doc.setFontSize(11);
  y += 22;
  for (const [k, v] of fieldRows(entry)) {
    doc.text(k, 48, y);
    doc.text(v, 300, y);
    y += 20;
  }

  y += 18;
  doc.setFontSize(9);
  doc.setTextColor(110, 116, 135);
  doc.text(
    "Model: Logistic Regression (scikit-learn) with one-hot encoded categorical features.",
    40,
    y,
  );
  doc.text("Indicative decision support only; not a final credit decision.", 40, y + 14);

  doc.save(`loan-prediction-${entry.id}.pdf`);
}

function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPredictionCsv(entry: HistoryEntry) {
  const input = entry.input as unknown as Record<string, string | number>;
  const keys = [...NUMERIC_FEATURES.map((f) => f.key), ...CATEGORICAL_FEATURES.map((f) => f.key)];
  const rows = [
    [
      ...keys,
      "Predicted Repayment",
      "Loan Status",
      "Default Probability",
      "Repayment Probability",
      "Risk Level",
      "Confidence",
      "Timestamp",
    ],
    [
      ...keys.map((k) => input[k] ?? ""),
      entry.result.predictedClass,
      entry.result.predictedClass === 0 ? "High Risk (Default)" : "Low Risk (No Default)",
      entry.result.defaultProbability.toFixed(4),
      entry.result.repaymentProbability.toFixed(4),
      entry.result.riskLevel,
      entry.result.confidence.toFixed(4),
      entry.createdAt,
    ],
  ];
  download(`loan-prediction-${entry.id}.csv`, toCsv(rows), "text/csv;charset=utf-8;");
}

export function downloadHistoryCsv(entries: HistoryEntry[]) {
  const keys = [...NUMERIC_FEATURES.map((f) => f.key), ...CATEGORICAL_FEATURES.map((f) => f.key)];
  const rows: (string | number)[][] = [
    [
      "Timestamp",
      ...keys,
      "Predicted Repayment",
      "Default Probability",
      "Risk Level",
      "Confidence",
    ],
  ];
  for (const entry of entries) {
    const input = entry.input as unknown as Record<string, string | number>;
    rows.push([
      entry.createdAt,
      ...keys.map((k) => input[k] ?? ""),
      entry.result.predictedClass,
      entry.result.defaultProbability.toFixed(4),
      entry.result.riskLevel,
      entry.result.confidence.toFixed(4),
    ]);
  }
  download("loan-prediction-history.csv", toCsv(rows), "text/csv;charset=utf-8;");
}
