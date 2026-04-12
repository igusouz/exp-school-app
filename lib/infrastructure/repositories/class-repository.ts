import { randomUUID } from "node:crypto";

import { JsonFileStore } from "@/lib/infrastructure/json-file-store";
import { dataPaths } from "@/lib/infrastructure/paths";
import { DEFAULT_GOALS } from "@/lib/shared/defaults";
import { Goal, SchoolClass } from "@/lib/shared/models";

interface ClassesStore {
  classes: SchoolClass[];
}

interface CreateClassPayload {
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
  goals?: Goal[];
}

interface UpdateClassPayload {
  topic?: string;
  year?: number;
  semester?: number;
  studentIds?: string[];
  goals?: Goal[];
}

export class ClassRepository {
  private readonly store = new JsonFileStore<ClassesStore>(dataPaths.classes, {
    classes: [],
  });

  async list(): Promise<SchoolClass[]> {
    const data = await this.store.read();
    return data.classes;
  }

  async findById(id: string): Promise<SchoolClass | null> {
    const classes = await this.list();
    return classes.find((schoolClass) => schoolClass.id === id) ?? null;
  }

  async create(payload: CreateClassPayload): Promise<SchoolClass> {
    const now = new Date().toISOString();
    const schoolClass: SchoolClass = {
      id: randomUUID(),
      topic: payload.topic,
      year: payload.year,
      semester: payload.semester,
      studentIds: payload.studentIds,
      goals: payload.goals?.length ? payload.goals : DEFAULT_GOALS,
      evaluations: [],
      createdAt: now,
      updatedAt: now,
    };

    const data = await this.store.read();
    data.classes.push(schoolClass);
    await this.store.write(data);
    return schoolClass;
  }

  async update(id: string, payload: UpdateClassPayload): Promise<SchoolClass | null> {
    const data = await this.store.read();
    const index = data.classes.findIndex((schoolClass) => schoolClass.id === id);
    if (index < 0) {
      return null;
    }

    const previous = data.classes[index];
    const updated: SchoolClass = {
      ...previous,
      ...payload,
      goals: payload.goals?.length ? payload.goals : previous.goals,
      updatedAt: new Date().toISOString(),
    };

    if (payload.studentIds) {
      const studentSet = new Set(payload.studentIds);
      updated.evaluations = previous.evaluations.filter((cell) =>
        studentSet.has(cell.studentId),
      );
    }

    data.classes[index] = updated;
    await this.store.write(data);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const data = await this.store.read();
    const before = data.classes.length;
    data.classes = data.classes.filter((schoolClass) => schoolClass.id !== id);
    const changed = before !== data.classes.length;
    if (changed) {
      await this.store.write(data);
    }
    return changed;
  }

  async removeStudentFromAllClasses(studentId: string): Promise<void> {
    const data = await this.store.read();
    let changed = false;

    data.classes = data.classes.map((schoolClass) => {
      const hadStudent = schoolClass.studentIds.includes(studentId);
      if (!hadStudent) {
        return schoolClass;
      }
      changed = true;
      return {
        ...schoolClass,
        studentIds: schoolClass.studentIds.filter((id) => id !== studentId),
        evaluations: schoolClass.evaluations.filter((cell) => cell.studentId !== studentId),
        updatedAt: new Date().toISOString(),
      };
    });

    if (changed) {
      await this.store.write(data);
    }
  }

  async saveOne(updatedClass: SchoolClass): Promise<void> {
    const data = await this.store.read();
    const index = data.classes.findIndex((schoolClass) => schoolClass.id === updatedClass.id);
    if (index < 0) {
      throw new Error("Class not found.");
    }
    data.classes[index] = updatedClass;
    await this.store.write(data);
  }
}

export const classRepository = new ClassRepository();
