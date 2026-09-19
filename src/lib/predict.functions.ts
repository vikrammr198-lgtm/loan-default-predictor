import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  CATEGORICAL_FEATURES,
  COEFFICIENTS,
  INTERCEPT,
  MODEL_ACCURACY,
  NUMERIC_FEATURES,
  TRAINING_COLUMNS,
  type PredictionResult,
} from "./model";

const numericShape = Object.fromEntries(
  NUMERIC_FEATURES.map((f) => [f.key, z.number().min(f.min).max(f.max)]),
) as Record<string, z.ZodNumber>;

const categoricalShape = Object.fromEntries(
  CATEGORICAL_FEATURES.map((f) => [f.key, z.string().min(1)]),
) as Record<string, z.ZodString>;

const ApplicationSchema = z.object({ ...numericShape, ...categoricalShape });

/**
 * Reproduces the notebook preprocessing: pd.get_dummies over the categorical
 * columns, then reindexed against the training columns (unseen categories
 * simply produce all-zero dummies instead of throwing).
 */
function buildFeatureRow(data: Record<string, number | string>): number[] {
  const encoded: Record<string, number> = {};
  for (const f of NUMERIC_FEATURES) encoded[f.key] = Number(data[f.key]);
  for (const f of CATEGORICAL_FEATURES) {
    for (const option of f.options) encoded[`${f.key}_${option}`] = 0;
    const chosen = `${f.key}_${String(data[f.key]).trim()}`;
    if (chosen in encoded) encoded[chosen] = 1;
  }
  return TRAINING_COLUMNS.map((col) => encoded[col] ?? 0);
}

/** sklearn's predict_proba for binary logistic regression. */
function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export const predictLoanRepayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ApplicationSchema.parse(input))
  .handler(async ({ data }): Promise<PredictionResult> => {
    const row = buildFeatureRow(data as Record<string, number | string>);

    let z = INTERCEPT;
    TRAINING_COLUMNS.forEach((col, i) => {
      z += (COEFFICIENTS[col] ?? 0) * (row[i] ?? 0);
    });

    // Class 1 = Repayment, class 0 = Default.
    const repaymentProbability = sigmoid(z);
    const defaultProbability = 1 - repaymentProbability;
    const predictedClass: 0 | 1 = repaymentProbability >= 0.5 ? 1 : 0;

    const riskLevel =
      defaultProbability < 0.35 ? "Low" : defaultProbability < 0.65 ? "Moderate" : "High";

    return {
      predictedClass,
      defaultProbability,
      repaymentProbability,
      riskLevel,
      confidence: Math.max(repaymentProbability, defaultProbability),
      modelAccuracy: MODEL_ACCURACY,
    };
  });
