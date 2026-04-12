export const EVALUATION_VALUES = ["MANA", "MPA", "MA"] as const;

export type EvaluationValue = (typeof EVALUATION_VALUES)[number];

export interface Student {
  id: string;
  name: string;
  cpf: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  label: string;
}

export interface EvaluationCell {
  studentId: string;
  goalId: string;
  value: EvaluationValue;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
  goals: Goal[];
  evaluations: EvaluationCell[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationChangeEvent {
  studentId: string;
  classId: string;
  classTopic: string;
  goalId: string;
  goalLabel: string;
  previousValue: EvaluationValue | null;
  newValue: EvaluationValue;
  changedAt: string;
}

export interface NotificationsStore {
  pending: EvaluationChangeEvent[];
  dispatchLog: Record<string, string>;
}
