import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { classService } from "@/lib/application/class-service";
import { studentService } from "@/lib/application/student-service";
import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { studentRepository } from "@/lib/infrastructure/repositories/student-repository";
import {
  backupDataFiles,
  resetDataFiles,
  restoreDataFiles,
} from "@/tests/support/data-store";

describe("StudentService", () => {
  let snapshot: Awaited<ReturnType<typeof backupDataFiles>>;

  beforeAll(async () => {
    snapshot = await backupDataFiles();
  });

  afterAll(async () => {
    await restoreDataFiles(snapshot);
  });

  beforeEach(async () => {
    await resetDataFiles();
  });

  it("creates a student with normalized CPF and lowercased email", async () => {
    const created = await studentService.create({
      name: "John Doe",
      cpf: "123.456.789-00",
      email: "John.Doe@Example.com",
    });

    expect(created.cpf).toBe("12345678900");
    expect(created.email).toBe("john.doe@example.com");

    const students = await studentRepository.list();
    expect(students).toHaveLength(1);
    expect(students[0].id).toBe(created.id);
  });

  it("rejects duplicate CPF", async () => {
    await studentService.create({
      name: "Student A",
      cpf: "111.222.333-44",
      email: "a@example.com",
    });

    await expect(
      studentService.create({
        name: "Student B",
        cpf: "11122233344",
        email: "b@example.com",
      }),
    ).rejects.toThrow("CPF already exists.");
  });

  it("removes student from all classes when deleted", async () => {
    const student = await studentService.create({
      name: "Jane Doe",
      cpf: "999.888.777-66",
      email: "jane@example.com",
    });

    const schoolClass = await classService.create({
      topic: "Intro to Programming",
      year: 2026,
      semester: 1,
      studentIds: [student.id],
      goals: [
        { id: "requirements", label: "Requirements" },
        { id: "testing", label: "Testing" },
      ],
    });

    await studentService.remove(student.id);

    const updated = await classRepository.findById(schoolClass.id);
    expect(updated).not.toBeNull();
    expect(updated?.studentIds).not.toContain(student.id);
    expect(updated?.evaluations).toHaveLength(0);
  });
});
