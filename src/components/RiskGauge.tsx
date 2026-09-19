type Props = {
  /** 0..1 probability of default. */
  value: number;
  label: string;
  tone: "success" | "warning" | "destructive";
};

const TONE_CLASS: Record<Props["tone"], string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function RiskGauge({ value, label, tone }: Props) {
  const pct = Math.min(1, Math.max(0, value));
  const radius = 74;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex h-48 w-48 shrink-0 items-center justify-center">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="14"
          className="stroke-muted"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={`${TONE_CLASS[tone]} transition-all duration-700 ease-out`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-3xl font-bold ${TONE_CLASS[tone]}`}>
          {(pct * 100).toFixed(1)}%
        </span>
        <span className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}
