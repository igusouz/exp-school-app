import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { classService } from "@/lib/application/class-service";
import { evaluationService } from "@/lib/application/evaluation-service";
import { notificationService } from "@/lib/application/notification-service";
import { studentService } from "@/lib/application/student-service";
import { todayDateKey } from "@/lib/application/validation";
import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { notificationRepository } from "@/lib/infrastructure/repositories/notification-repository";
import {
  backupDataFiles,
  resetDataFiles,
  restoreDataFiles,
} from "@/tests/support/data-store";

describe("Evaluation and Notification flow", () => {
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

  it("queues notification events when evaluations change", async () => {
    const student = await studentService.create({
      name: "John Doe",
      cpf: "12345678901",
      email: "john@example.com",
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

    await evaluationService.updateMatrix(schoolClass.id, [
      { studentId: student.id, goalId: "requirements", value: "MPA" },
      { studentId: student.id, goalId: "testing", value: "MA" },
    ]);

    const updatedClass = await classRepository.findById(schoolClass.id);
    expect(updatedClass?.evaluations).toHaveLength(2);

    const notifications = await notificationRepository.read();
    expect(notifications.pending.length).toBeGreaterThanOrEqual(2);
    expect(notifications.dispatchLog[student.id]).toBeUndefined();
  });

  it("sends one daily summary per student even with multiple class changes", async () => {
    const student = await studentService.create({
      name: "John Doe",
      cpf: "12345678902",
      email: "john2@example.com",
    });

    const classA = await classService.create({
      topic: "Intro to Programming",
      year: 2026,
      semester: 1,
      studentIds: [student.id],
      goals: [{ id: "requirements", label: "Requirements" }],
    });

    const classB = await classService.create({
      topic: "Software Testing",
      year: 2026,
      semester: 1,
      studentIds: [student.id],
      goals: [{ id: "testing", label: "Testing" }],
    });

    await evaluationService.updateMatrix(classA.id, [
      { studentId: student.id, goalId: "requirements", value: "MPA" },
    ]);

    await evaluationService.updateMatrix(classB.id, [
      { studentId: student.id, goalId: "testing", value: "MA" },
    ]);

    const result = await notificationService.dispatchDailySummaries();

    expect(result.sent).toBe(1);

    const store = await notificationRepository.read();
    expect(store.dispatchLog[student.id]).toBe(todayDateKey());
    expect(store.pending.find((event) => event.studentId === student.id)).toBeUndefined();
  });

  it("skips sending if the student already received summary today", async () => {
    const student = await studentService.create({
      name: "John Doe",
      cpf: "12345678903",
      email: "john3@example.com",
    });

    const today = todayDateKey();
    await notificationRepository.markDispatched(student.id, today);

    await notificationRepository.append([
      {
        studentId: student.id,
        classId: "class-x",
        classTopic: "Any Class",
        goalId: "requirements",
        goalLabel: "Requirements",
        previousValue: null,
        newValue: "MANA",
        changedAt: new Date().toISOString(),
      },
    ]);

    const result = await notificationService.dispatchDailySummaries();

    expect(result.sent).toBe(0);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });
});
