import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { studentRepository } from "@/lib/infrastructure/repositories/student-repository";
import { DEFAULT_GOALS } from "@/lib/shared/defaults";
import { Goal, SchoolClass } from "@/lib/shared/models";

function sanitizeGoals(goals?: Goal[]): Goal[] {
  if (!goals?.length) {
    return DEFAULT_GOALS;
  }

  const clean = goals
    .map((goal) => ({
      id: goal.id.trim().toLowerCase().replace(/\s+/g, "-"),
      label: goal.label.trim(),
    }))
    .filter((goal) => goal.id && goal.label);

  return clean.length ? clean : DEFAULT_GOALS;
}

export class ClassService {
  async list(): Promise<SchoolClass[]> {
    return classRepository.list();
  }

  async getById(id: string): Promise<SchoolClass> {
    const schoolClass = await classRepository.findById(id);
    if (!schoolClass) {
      throw new Error("Class not found.");
    }
    return schoolClass;
  }

  async create(payload: {
    topic: string;
    year: number;
    semester: number;
    studentIds: string[];
    goals?: Goal[];
  }): Promise<SchoolClass> {
    const topic = payload.topic.trim();
    if (!topic) {
      throw new Error("Class topic is required.");
    }

    if (payload.semester !== 1 && payload.semester !== 2) {
      throw new Error("Semester must be 1 or 2.");
    }

    const now = new Date().getFullYear();
    if (payload.year < 2000 || payload.year > now + 5) {
      throw new Error("Year is outside allowed range.");
    }

    await this.ensureStudentsExist(payload.studentIds);

    return classRepository.create({
      topic,
      year: payload.year,
      semester: payload.semester,
      studentIds: [...new Set(payload.studentIds)],
      goals: sanitizeGoals(payload.goals),
    });
  }

  async update(
    id: string,
    payload: Partial<{
      topic: string;
      year: number;
      semester: number;
      studentIds: string[];
      goals: Goal[];
    }>,
  ): Promise<SchoolClass> {
    if (payload.studentIds) {
      await this.ensureStudentsExist(payload.studentIds);
      payload.studentIds = [...new Set(payload.studentIds)];
    }

    if (payload.topic !== undefined && !payload.topic.trim()) {
      throw new Error("Class topic is required.");
    }

    if (
      payload.semester !== undefined &&
      payload.semester !== 1 &&
      payload.semester !== 2
    ) {
      throw new Error("Semester must be 1 or 2.");
    }

    if (payload.goals) {
      payload.goals = sanitizeGoals(payload.goals);
    }

    const updated = await classRepository.update(id, {
      ...payload,
      topic: payload.topic?.trim(),
    });
    if (!updated) {
      throw new Error("Class not found.");
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await classRepository.remove(id);
    if (!removed) {
      throw new Error("Class not found.");
    }
  }

  private async ensureStudentsExist(studentIds: string[]): Promise<void> {
    const uniqueIds = [...new Set(studentIds)];
    const students = await studentRepository.list();
    const studentIdSet = new Set(students.map((student) => student.id));
    const invalid = uniqueIds.filter((id) => !studentIdSet.has(id));
    if (invalid.length) {
      throw new Error("One or more student IDs are invalid.");
    }
  }
}

export const classService = new ClassService();
