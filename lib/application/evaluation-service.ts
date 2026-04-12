import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { notificationService } from "@/lib/application/notification-service";
import { isValidEvaluationValue } from "@/lib/application/validation";
import { EvaluationCell, EvaluationChangeEvent, EvaluationValue } from "@/lib/shared/models";

interface EvaluationPatch {
  studentId: string;
  goalId: string;
  value: EvaluationValue;
}

export class EvaluationService {
  async updateMatrix(classId: string, patches: EvaluationPatch[]): Promise<EvaluationCell[]> {
    if (!patches.length) {
      throw new Error("At least one evaluation patch is required.");
    }

    const schoolClass = await classRepository.findById(classId);
    if (!schoolClass) {
      throw new Error("Class not found.");
    }

    const studentIds = new Set(schoolClass.studentIds);
    const goals = new Map(schoolClass.goals.map((goal) => [goal.id, goal]));
    const currentMap = new Map(
      schoolClass.evaluations.map((cell) => [`${cell.studentId}:${cell.goalId}`, cell]),
    );

    const now = new Date().toISOString();
    const changes: EvaluationChangeEvent[] = [];

    for (const patch of patches) {
      if (!studentIds.has(patch.studentId)) {
        throw new Error("Evaluation contains a student not enrolled in this class.");
      }
      const goal = goals.get(patch.goalId);
      if (!goal) {
        throw new Error("Evaluation contains an unknown goal.");
      }
      if (!isValidEvaluationValue(patch.value)) {
        throw new Error("Invalid evaluation value.");
      }

      const key = `${patch.studentId}:${patch.goalId}`;
      const previous = currentMap.get(key);
      if (previous?.value === patch.value) {
        continue;
      }

      currentMap.set(key, {
        studentId: patch.studentId,
        goalId: patch.goalId,
        value: patch.value,
        updatedAt: now,
      });

      changes.push({
        studentId: patch.studentId,
        classId: schoolClass.id,
        classTopic: schoolClass.topic,
        goalId: goal.id,
        goalLabel: goal.label,
        previousValue: previous?.value ?? null,
        newValue: patch.value,
        changedAt: now,
      });
    }

    const updatedClass = {
      ...schoolClass,
      evaluations: [...currentMap.values()],
      updatedAt: now,
    };

    await classRepository.saveOne(updatedClass);

    if (changes.length) {
      await notificationService.recordEvaluationChanges(changes);
    }

    return updatedClass.evaluations;
  }
}

export const evaluationService = new EvaluationService();
