import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Download,
  FileText,
  Info,
  Landmark,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { RiskGauge } from "@/components/RiskGauge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CATEGORICAL_FEATURES,
  EMPTY_FORM,
  MODEL_ACCURACY,
  NUMERIC_FEATURES,
  SAMPLE_FORM,
  type LoanApplication,
  type PredictionResult,
} from "@/lib/model";
import { computeStats, loadHistory, saveHistory, type HistoryEntry } from "@/lib/history";
import { downloadHistoryCsv, downloadPredictionCsv, downloadPredictionPdf } from "@/lib/exporters";
import { predictLoanRepayment } from "@/lib/predict.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loan Default Predictor | AI Credit Risk Dashboard" },
      {
        name: "description",
        content:
          "Predict loan default risk instantly with a logistic regression credit model. Probability gauges, risk levels, PDF/CSV export and prediction history.",
      },
      { property: "og:title", content: "Loan Default Predictor | AI Credit Risk Dashboard" },
      {
        property: "og:description",
        content:
          "Score loan applicants in seconds: default probability, risk level, confidence score and exportable reports.",
      },
    ],
  }),
  component: LoanPredictor,
});

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={`About ${label}`} className="text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{tooltip}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "primary",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone?: "primary" | "success" | "destructive" | "warning";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning",
  }[tone];

  return (
    <div className="card-elevated flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function LoanPredictor() {
  const predict = useServerFn(predictLoanRepayment);

  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    const prefersDark =
      window.localStorage.getItem("loan-theme") === "dark" ||
      (!window.localStorage.getItem("loan-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("loan-theme", dark ? "dark" : "light");
  }, [dark]);

  const stats = useMemo(() => computeStats(history), [history]);

  const setField = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of NUMERIC_FEATURES) {
      const raw = form[f.key]?.trim() ?? "";
      if (raw === "") next[f.key] = "Required";
      else {
        const n = Number(raw);
        if (!Number.isFinite(n)) next[f.key] = "Enter a valid number";
        else if (n < f.min || n > f.max) next[f.key] = `Must be between ${f.min} and ${f.max}`;
        else if (f.step === 1 && !Number.isInteger(n)) next[f.key] = "Must be a whole number";
      }
    }
    for (const f of CATEGORICAL_FEATURES) {
      if (!form[f.key]) next[f.key] = "Select an option";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onPredict = async () => {
    if (!validate()) {
      toast.error("Please fix the highlighted fields before predicting.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...Object.fromEntries(NUMERIC_FEATURES.map((f) => [f.key, Number(form[f.key])])),
        ...Object.fromEntries(CATEGORICAL_FEATURES.map((f) => [f.key, form[f.key]!])),
      } as unknown as LoanApplication;

      const result = (await predict({ data: payload })) as PredictionResult;
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        input: payload,
        result,
      };
      setCurrent(entry);
      const next = [entry, ...history].slice(0, 50);
      setHistory(next);
      saveHistory(next);
      toast.success(
        result.predictedClass === 1
          ? "Low risk: applicant is likely to repay."
          : "High risk: default predicted.",
      );
    } catch (err) {
      console.error(err);
      toast.error("Prediction failed. Please review the inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const onReset = () => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setCurrent(null);
    toast("Form reset");
  };

  const onSample = () => {
    setForm({ ...SAMPLE_FORM });
    setErrors({});
    toast.success("Sample applicant loaded");
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast("Prediction history cleared");
  };

  const isDefault = current?.result.predictedClass === 0;
  const tone = !current
    ? "success"
    : current.result.riskLevel === "Low"
      ? "success"
      : current.result.riskLevel === "Moderate"
        ? "warning"
        : "destructive";

  return (
    <main className="bg-app-gradient min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Landmark className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                Loan Default Predictor
              </h1>
              <p className="text-sm text-muted-foreground">
                Logistic regression credit risk scoring · test accuracy {pct(MODEL_ACCURACY)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            aria-label="Toggle dark mode"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={BarChart3} label="Total Predictions" value={String(stats.total)} />
          <StatCard
            icon={AlertTriangle}
            label="Default Predictions"
            value={String(stats.defaults)}
            tone="destructive"
          />
          <StatCard
            icon={ShieldCheck}
            label="Non-Default Predictions"
            value={String(stats.nonDefaults)}
            tone="success"
          />
          <StatCard
            icon={TrendingDown}
            label="Avg Default Probability"
            value={pct(stats.avgDefaultProbability)}
            tone="warning"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="card-elevated p-6 lg:col-span-3">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Applicant Details</h2>
                <p className="text-sm text-muted-foreground">
                  All nine model features, one-hot encoded before scoring.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={onSample}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Sample Data
              </Button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {NUMERIC_FEATURES.map((f) => (
                <div key={f.key}>
                  <FieldLabel label={`${f.label} (${f.unit})`} tooltip={f.tooltip} />
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    placeholder={`${f.min} – ${f.max}`}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    aria-invalid={Boolean(errors[f.key])}
                    className={errors[f.key] ? "border-destructive" : ""}
                  />
                  {errors[f.key] && (
                    <p className="mt-1 text-xs text-destructive">{errors[f.key]}</p>
                  )}
                </div>
              ))}

              {CATEGORICAL_FEATURES.map((f) => (
                <div key={f.key}>
                  <FieldLabel label={f.label} tooltip={f.tooltip} />
                  <Select value={form[f.key] ?? ""} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger
                      aria-invalid={Boolean(errors[f.key])}
                      className={`w-full ${errors[f.key] ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder={`Select ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors[f.key] && (
                    <p className="mt-1 text-xs text-destructive">{errors[f.key]}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                onClick={onPredict}
                disabled={loading}
                className="min-w-40 flex-1 sm:flex-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring…
                  </>
                ) : (
                  <>
                    <Activity className="mr-2 h-4 w-4" /> Predict Default Risk
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onReset} disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reset Form
              </Button>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="card-elevated p-6">
              <h2 className="font-display text-lg font-semibold">Prediction Result</h2>

              {!current && !loading && (
                <div className="mt-10 flex flex-col items-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <BadgeCheck className="h-7 w-7" />
                  </span>
                  <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                    Fill in the applicant details and run a prediction to see default probability,
                    risk level and confidence.
                  </p>
                </div>
              )}

              {loading && (
                <div className="mt-12 flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="mt-4 text-sm text-muted-foreground">Running the credit model…</p>
                </div>
              )}

              {current && !loading && (
                <div className="animate-rise mt-4 flex flex-col items-center">
                  <div
                    className={`w-full rounded-xl border px-4 py-3 text-center text-sm font-semibold ${
                      isDefault
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-success/30 bg-success/10 text-success"
                    }`}
                  >
                    {isDefault ? "❌ High Risk (Default)" : "✅ Low Risk (No Default)"}
                  </div>

                  <RiskGauge
                    value={current.result.defaultProbability}
                    label="Default risk"
                    tone={tone as "success" | "warning" | "destructive"}
                  />

                  <dl className="w-full space-y-2 text-sm">
                    {[
                      ["Default Probability", pct(current.result.defaultProbability)],
                      ["Repayment Probability", pct(current.result.repaymentProbability)],
                      ["Risk Level", current.result.riskLevel],
                      ["Confidence Score", pct(current.result.confidence)],
                      ["Predicted Class", String(current.result.predictedClass)],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between rounded-lg bg-surface px-3 py-2"
                      >
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-semibold">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-5 flex w-full flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        downloadPredictionPdf(current);
                        toast.success("PDF report downloaded");
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        downloadPredictionCsv(current);
                        toast.success("CSV exported");
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" /> CSV
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="card-elevated mt-6 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Recent Prediction History</h2>
              <p className="text-sm text-muted-foreground">
                Stored locally in this browser · last {Math.min(history.length, 50)} of 50
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={history.length === 0}
                onClick={() => {
                  downloadHistoryCsv(history);
                  toast.success("History exported");
                }}
              >
                <Download className="mr-1.5 h-4 w-4" /> Export all
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={history.length === 0}
                onClick={clearHistory}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Clear
              </Button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No predictions yet — your history will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Time</th>
                    <th className="py-2 pr-4 font-medium">Credit Score</th>
                    <th className="py-2 pr-4 font-medium">Income</th>
                    <th className="py-2 pr-4 font-medium">Borrowed</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Default %</th>
                    <th className="py-2 pr-4 font-medium">Risk</th>
                    <th className="py-2 font-medium">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 whitespace-nowrap text-muted-foreground">
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 pr-4">{h.input["Credit Score"]}</td>
                      <td className="py-2.5 pr-4">{h.input["Annual Income (LPA)"]}</td>
                      <td className="py-2.5 pr-4">{h.input["Borrowed Amount (LPA)"]}</td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            h.result.predictedClass === 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-success/10 text-success"
                          }`}
                        >
                          {h.result.predictedClass === 0 ? "Default" : "No Default"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-medium">
                        {pct(h.result.defaultProbability)}
                      </td>
                      <td className="py-2.5 pr-4">{h.result.riskLevel}</td>
                      <td className="py-2.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadPredictionPdf(h)}
                          aria-label="Download PDF report"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Logistic regression (scikit-learn) with one-hot encoded categorical features · indicative
          decision support only.
        </footer>
      </div>
    </main>
  );
}
