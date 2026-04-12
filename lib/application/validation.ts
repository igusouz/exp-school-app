import { EVALUATION_VALUES } from "@/lib/shared/models";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  return /^\d{11}$/.test(cpf);
}

export function isValidEvaluationValue(value: string): boolean {
  return EVALUATION_VALUES.includes(value as (typeof EVALUATION_VALUES)[number]);
}

export function todayDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
