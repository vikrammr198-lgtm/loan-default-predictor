/**
 * Logistic Regression model definition, ported 1:1 from the Python notebook.
 *
 * Training pipeline (unchanged):
 *   X = data.drop('Repayment ', axis=1)
 *   X = pd.get_dummies(X, columns=['Employment Status','Marital Status','Education Level'])
 *   train_test_split(test_size=0.2, random_state=42)
 *   LogisticRegression().fit(X_train, y_train)   # lbfgs, C=1.0, max_iter=100
 *
 * Target: Repayment -> 1 = repaid (No Default), 0 = default.
 * Coefficients below are the fitted `model.coef_` / `model.intercept_`.
 */

export const NUMERIC_FEATURES = [
  {
    key: "Age",
    label: "Age",
    unit: "years",
    step: 1,
    min: 18,
    max: 100,
    tooltip: "Applicant's age in years. Mid-career applicants typically repay more reliably.",
  },
  {
    key: "Annual Income (LPA)",
    label: "Annual Income",
    unit: "LPA",
    step: 0.01,
    min: 0,
    max: 200,
    tooltip: "Gross yearly income in lakhs per annum. Higher income increases repayment capacity.",
  },
  {
    key: "Borrowed Amount (LPA)",
    label: "Borrowed Amount",
    unit: "LPA",
    step: 0.01,
    min: 0,
    max: 200,
    tooltip: "Requested loan principal in lakhs. Large amounts relative to income raise default risk.",
  },
  {
    key: "Credit Score",
    label: "Credit Score",
    unit: "300-900",
    step: 1,
    min: 300,
    max: 900,
    tooltip: "Bureau credit score. The strongest positive driver of repayment in this model.",
  },
  {
    key: "Loan Tenure (months)",
    label: "Loan Tenure",
    unit: "months",
    step: 1,
    min: 1,
    max: 360,
    tooltip: "Repayment period in months. Longer tenures carry slightly more risk exposure.",
  },
  {
    key: "Existing Loans",
    label: "Existing Loans",
    unit: "count",
    step: 1,
    min: 0,
    max: 20,
    tooltip: "Number of active loans already held. More parallel obligations increase default odds.",
  },
] as const;

export const CATEGORICAL_FEATURES = [
  {
    key: "Employment Status",
    label: "Employment Status",
    options: ["Salaried", "Self-Employed", "Unemployed"],
    tooltip: "Primary source of income. One-hot encoded exactly as in the training data.",
  },
  {
    key: "Marital Status",
    label: "Marital Status",
    options: ["Married", "Single"],
    tooltip: "Marital status of the applicant, one-hot encoded before prediction.",
  },
  {
    key: "Education Level",
    label: "Education Level",
    options: ["Graduate", "Post-Graduate"],
    tooltip: "Highest completed education level, one-hot encoded before prediction.",
  },
] as const;

/** Column order produced by pd.get_dummies on the training frame. */
export const TRAINING_COLUMNS = [
  "Age",
  "Annual Income (LPA)",
  "Borrowed Amount (LPA)",
  "Credit Score",
  "Loan Tenure (months)",
  "Existing Loans",
  "Employment Status_Salaried",
  "Employment Status_Self-Employed",
  "Employment Status_Unemployed",
  "Marital Status_Married",
  "Marital Status_Single",
  "Education Level_Graduate",
  "Education Level_Post-Graduate",
] as const;

export const COEFFICIENTS: Record<string, number> = {
  Age: 0.020203184471402437,
  "Annual Income (LPA)": 0.17708531896797647,
  "Borrowed Amount (LPA)": -0.06721878343695459,
  "Credit Score": 0.0067879525946754294,
  "Loan Tenure (months)": -0.0050008162403238415,
  "Existing Loans": -0.5140500196547102,
  "Employment Status_Salaried": -0.9585161881441927,
  "Employment Status_Self-Employed": -0.21277667750968515,
  "Employment Status_Unemployed": -1.0690124398862333,
  "Marital Status_Married": -0.9852969018762332,
  "Marital Status_Single": -1.2550084036626095,
  "Education Level_Graduate": -1.2215336509167052,
  "Education Level_Post-Graduate": -1.0187716546219776,
};

export const INTERCEPT = -2.294762911457024;

export const MODEL_ACCURACY = 0.775;

export type LoanApplication = {
  Age: number;
  "Annual Income (LPA)": number;
  "Borrowed Amount (LPA)": number;
  "Credit Score": number;
  "Loan Tenure (months)": number;
  "Existing Loans": number;
  "Employment Status": string;
  "Marital Status": string;
  "Education Level": string;
};

export type PredictionResult = {
  predictedClass: 0 | 1;
  defaultProbability: number;
  repaymentProbability: number;
  riskLevel: "Low" | "Moderate" | "High";
  confidence: number;
  modelAccuracy: number;
};

export const EMPTY_FORM: Record<string, string> = {
  Age: "",
  "Annual Income (LPA)": "",
  "Borrowed Amount (LPA)": "",
  "Credit Score": "",
  "Loan Tenure (months)": "",
  "Existing Loans": "",
  "Employment Status": "",
  "Marital Status": "",
  "Education Level": "",
};

export const SAMPLE_FORM: Record<string, string> = {
  Age: "41",
  "Annual Income (LPA)": "16.97",
  "Borrowed Amount (LPA)": "14.23",
  "Credit Score": "786",
  "Loan Tenure (months)": "96",
  "Existing Loans": "1",
  "Employment Status": "Salaried",
  "Marital Status": "Married",
  "Education Level": "Post-Graduate",
};
