import { randomUUID } from "node:crypto";

import { JsonFileStore } from "@/lib/infrastructure/json-file-store";
import { dataPaths } from "@/lib/infrastructure/paths";
import { Student } from "@/lib/shared/models";

interface StudentsStore {
  students: Student[];
}

export class StudentRepository {
  private readonly store = new JsonFileStore<StudentsStore>(dataPaths.students, {
    students: [],
  });

  async list(): Promise<Student[]> {
    const data = await this.store.read();
    return data.students;
  }

  async findById(id: string): Promise<Student | null> {
    const students = await this.list();
    return students.find((student) => student.id === id) ?? null;
  }

  async findByEmail(email: string): Promise<Student | null> {
    const students = await this.list();
    return (
      students.find(
        (student) => student.email.toLowerCase() === email.toLowerCase(),
      ) ?? null
    );
  }

  async findByCpf(cpf: string): Promise<Student | null> {
    const students = await this.list();
    return students.find((student) => student.cpf === cpf) ?? null;
  }

  async create(payload: Pick<Student, "name" | "cpf" | "email">): Promise<Student> {
    const now = new Date().toISOString();
    const student: Student = {
      id: randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now,
    };

    const data = await this.store.read();
    data.students.push(student);
    await this.store.write(data);
    return student;
  }

  async update(
    id: string,
    payload: Partial<Pick<Student, "name" | "cpf" | "email">>,
  ): Promise<Student | null> {
    const data = await this.store.read();
    const index = data.students.findIndex((student) => student.id === id);
    if (index < 0) {
      return null;
    }

    const updated: Student = {
      ...data.students[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    data.students[index] = updated;
    await this.store.write(data);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    const data = await this.store.read();
    const before = data.students.length;
    data.students = data.students.filter((student) => student.id !== id);
    const changed = before !== data.students.length;
    if (changed) {
      await this.store.write(data);
    }
    return changed;
  }
}

export const studentRepository = new StudentRepository();
