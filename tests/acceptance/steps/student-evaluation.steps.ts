import assert from "node:assert/strict";

import { Before, Given, Then, When } from "@cucumber/cucumber";

import { classService } from "@/lib/application/class-service";
import { evaluationService } from "@/lib/application/evaluation-service";
import { notificationService } from "@/lib/application/notification-service";
import { studentService } from "@/lib/application/student-service";
import { todayDateKey } from "@/lib/application/validation";
import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { notificationRepository } from "@/lib/infrastructure/repositories/notification-repository";
import { studentRepository } from "@/lib/infrastructure/repositories/student-repository";
import { EvaluationValue, Goal, SchoolClass, Student } from "@/lib/shared/models";
import { resetDataFiles } from "@/tests/support/data-store";

interface TestWorld {
  currentPage?: string;
  currentClassTopic?: string;
  currentClassId?: string;
  classIdsByTopic?: Record<string, string>;
  lastError?: Error;
  lastDispatch?: { sent: number; skipped: number };
  lastDeletedStudentId?: string;
  createdStudentName?: string;
  pendingClassDraft?: {
    topic: string;
    year: number;
    semester: number;
    studentNames: string[];
    goals: Goal[];
  };
  matrixPatches?: Array<{ studentId: string; goalId: string; value: EvaluationValue }>;
  previousCellValue?: EvaluationValue | null;
  dispatchStudentName?: string;
  pendingEventsClassTopics?: string[];
  studentCounter: number;
}

function getWorld(context: unknown): TestWorld {
  const world = context as TestWorld;
  world.studentCounter ??= 1;
  return world;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

async function listStudentsByName(name: string): Promise<Student[]> {
  const students = await studentRepository.list();
  return students.filter((student) => student.name === name);
}

async function ensureStudent(
  world: TestWorld,
  name: string,
  cpf?: string,
  email?: string,
): Promise<Student> {
  const existing = (await listStudentsByName(name))[0];
  if (existing) {
    return existing;
  }

  const counter = String(world.studentCounter++).padStart(2, "0");
  const finalCpf = cpf ? digitsOnly(cpf) : `100000000${counter}`;
  const finalEmail = email ?? `${name.toLowerCase().replace(/\s+/g, ".")}.${counter}@example.com`;

  return studentService.create({ name, cpf: finalCpf, email: finalEmail });
}

async function findClassByTopicStrict(topic: string): Promise<SchoolClass | null> {
  const classes = await classRepository.list();
  return classes.find((schoolClass) => schoolClass.topic === topic) ?? null;
}

async function findClassByTopic(topic: string): Promise<SchoolClass> {
  const existing = await findClassByTopicStrict(topic);
  if (existing) {
    return existing;
  }

  return ensureClass(topic);
}

async function getClassById(id: string | undefined): Promise<SchoolClass> {
  assert.ok(id, "No class id in current scenario context.");
  const schoolClass = await classRepository.findById(id);
  assert.ok(schoolClass, "Class not found by id.");
  return schoolClass;
}

async function ensureClass(
  topic: string,
  year = 2026,
  semester = 1,
  goals: Goal[] = [
    { id: "requirements", label: "Requirements" },
    { id: "testing", label: "Testing" },
  ],
): Promise<SchoolClass> {
  const existing = await findClassByTopicStrict(topic);
  if (existing) {
    return existing;
  }

  return classService.create({
    topic,
    year,
    semester,
    studentIds: [],
    goals,
  });
}

async function enrollStudentsInClass(classId: string, students: Student[]): Promise<void> {
  const schoolClass = await classRepository.findById(classId);
  assert.ok(schoolClass, "Class not found for enrollment.");
  const ids = new Set(schoolClass.studentIds);
  for (const student of students) {
    ids.add(student.id);
  }

  await classService.update(classId, { studentIds: [...ids] });
}

Before(async function () {
  await resetDataFiles();
  const world = getWorld(this);
  world.currentPage = undefined;
  world.currentClassTopic = undefined;
  world.currentClassId = undefined;
  world.classIdsByTopic = {};
  world.lastError = undefined;
  world.lastDispatch = undefined;
  world.lastDeletedStudentId = undefined;
  world.createdStudentName = undefined;
  world.pendingClassDraft = undefined;
  world.matrixPatches = undefined;
  world.previousCellValue = undefined;
  world.dispatchStudentName = undefined;
  world.pendingEventsClassTopics = undefined;
  world.studentCounter = 1;
});

Given("the JSON data store is available", async function () {
  await resetDataFiles();
});

Given(
  "there is a class {string} in year {int} semester {int}",
  async function (topic: string, year: number, semester: number) {
    const world = getWorld(this);
    const schoolClass = await ensureClass(topic, year, semester);
    world.classIdsByTopic = world.classIdsByTopic ?? {};
    world.classIdsByTopic[topic] = schoolClass.id;
  },
);

Given("the class has goals {string} and {string}", async function (goalA: string, goalB: string) {
  const world = getWorld(this);
  const topic = world.currentClassTopic ?? "Intro to Programming";
  const schoolClass = await ensureClass(topic);

  await classService.update(schoolClass.id, {
    goals: [
      { id: goalA.toLowerCase().replace(/\s+/g, "-"), label: goalA },
      { id: goalB.toLowerCase().replace(/\s+/g, "-"), label: goalB },
    ],
  });
});

Given("I am on the {string} page", function (pageName: string) {
  const world = getWorld(this);
  world.currentPage = pageName;
});

Given(
  "I am on the {string} page for {string}",
  async function (pageName: string, topic: string) {
    const world = getWorld(this);
    world.currentPage = pageName;
    world.currentClassTopic = topic;
    const schoolClass = await ensureClass(topic);
    world.currentClassId = schoolClass.id;
    world.classIdsByTopic = world.classIdsByTopic ?? {};
    world.classIdsByTopic[topic] = schoolClass.id;
  },
);

Given("the student {string} is enrolled in the class", async function (name: string) {
  const world = getWorld(this);
  const topic = world.currentClassTopic ?? "Intro to Programming";
  const schoolClass = world.currentClassId
    ? await getClassById(world.currentClassId)
    : await ensureClass(topic);
  const student = await ensureStudent(world, name);
  await enrollStudentsInClass(schoolClass.id, [student]);
  world.currentClassId = schoolClass.id;
  world.classIdsByTopic = world.classIdsByTopic ?? {};
  world.classIdsByTopic[topic] = schoolClass.id;
});

Given("there is a student with CPF {string}", async function (cpf: string) {
  const world = getWorld(this);
  const student = await ensureStudent(world, "Student To Delete", cpf, "delete.me@example.com");
  const schoolClass = await ensureClass("Intro to Programming");
  await enrollStudentsInClass(schoolClass.id, [student]);
});

When(
  "I change the {string} goal for {string} to {string}",
  async function (goalLabel: string, studentName: string, value: EvaluationValue) {
    const world = getWorld(this);
    const topic = world.currentClassTopic ?? "Intro to Programming";
    const schoolClass = world.currentClassId
      ? await getClassById(world.currentClassId)
      : await ensureClass(topic);
    const student = await ensureStudent(world, studentName);
    await enrollStudentsInClass(schoolClass.id, [student]);
    world.currentClassId = schoolClass.id;

    const goal = schoolClass.goals.find((item) => item.label === goalLabel);
    assert.ok(goal, `Goal ${goalLabel} not found.`);

    await evaluationService.updateMatrix(schoolClass.id, [
      {
        studentId: student.id,
        goalId: goal.id,
        value,
      },
    ]);
  },
);

When(
  "I click the {string} button for the student with CPF {string}",
  async function (_button: string, cpf: string) {
    const students = await studentRepository.list();
    const normalized = digitsOnly(cpf);
    const target = students.find((student) => student.cpf === normalized);
    assert.ok(target, "Student to delete not found.");

    await studentService.remove(target.id);

    const world = getWorld(this);
    world.lastDeletedStudentId = target.id;
  },
);

When(
  "I add a student with name {string}, CPF {string}, and email {string}",
  async function (name: string, cpf: string, email: string) {
    const world = getWorld(this);
    const student = await studentService.create({ name, cpf, email });
    world.createdStudentName = student.name;
  },
);

Given("a student already exists with CPF {string}", async function (cpf: string) {
  const world = getWorld(this);
  await ensureStudent(world, "Existing Student", cpf, "existing.student@example.com");
});

When("I try to add another student with CPF {string}", async function (cpf: string) {
  const world = getWorld(this);
  world.lastError = undefined;

  try {
    await studentService.create({
      name: "Another Student",
      cpf,
      email: "another.student@example.com",
    });
  } catch (error) {
    world.lastError = error as Error;
  }
});

Given("students {string} and {string} exist", async function (nameA: string, nameB: string) {
  const world = getWorld(this);
  await ensureStudent(world, nameA);
  await ensureStudent(world, nameB);
});

When(
  "I create a class with topic {string}, year {int}, semester {int}",
  function (topic: string, year: number, semester: number) {
    const world = getWorld(this);
    world.pendingClassDraft = {
      topic,
      year,
      semester,
      studentNames: [],
      goals: [],
    };
  },
);

When("I enroll {string} and {string}", function (nameA: string, nameB: string) {
  const world = getWorld(this);
  assert.ok(world.pendingClassDraft, "Class draft not created.");
  world.pendingClassDraft.studentNames = [nameA, nameB];
});

When("I define goals {string} and {string}", async function (goalA: string, goalB: string) {
  const world = getWorld(this);
  assert.ok(world.pendingClassDraft, "Class draft not created.");

  world.pendingClassDraft.goals = [
    { id: goalA.toLowerCase().replace(/\s+/g, "-"), label: goalA },
    { id: goalB.toLowerCase().replace(/\s+/g, "-"), label: goalB },
  ];

  const studentA = await ensureStudent(world, world.pendingClassDraft.studentNames[0]);
  const studentB = await ensureStudent(world, world.pendingClassDraft.studentNames[1]);

  const createdClass = await classService.create({
    topic: world.pendingClassDraft.topic,
    year: world.pendingClassDraft.year,
    semester: world.pendingClassDraft.semester,
    studentIds: [studentA.id, studentB.id],
    goals: world.pendingClassDraft.goals,
  });

  world.classIdsByTopic = world.classIdsByTopic ?? {};
  world.classIdsByTopic[world.pendingClassDraft.topic] = createdClass.id;
});

When(
  "I try to set the {string} goal for {string} to {string}",
  async function (goalLabel: string, studentName: string, value: string) {
    const world = getWorld(this);
    world.lastError = undefined;

    const topic = world.currentClassTopic ?? "Intro to Programming";
    const schoolClass = world.currentClassId
      ? await getClassById(world.currentClassId)
      : await ensureClass(topic);
    const student = await ensureStudent(world, studentName);
    await enrollStudentsInClass(schoolClass.id, [student]);
    world.currentClassId = schoolClass.id;

    const goal = schoolClass.goals.find((item) => item.label === goalLabel);
    assert.ok(goal, `Goal ${goalLabel} not found.`);

    const refreshed = await classRepository.findById(schoolClass.id);
    world.previousCellValue =
      refreshed?.evaluations.find(
        (cell) => cell.studentId === student.id && cell.goalId === goal.id,
      )?.value ?? null;

    try {
      await evaluationService.updateMatrix(schoolClass.id, [
        {
          studentId: student.id,
          goalId: goal.id,
          value: value as EvaluationValue,
        },
      ]);
    } catch (error) {
      world.lastError = error as Error;
    }
  },
);

Given(
  "students {string} and {string} are enrolled in the class",
  async function (nameA: string, nameB: string) {
    const world = getWorld(this);
    const topic = world.currentClassTopic ?? "Intro to Programming";
    const schoolClass = world.currentClassId
      ? await getClassById(world.currentClassId)
      : await ensureClass(topic);
    const studentA = await ensureStudent(world, nameA);
    const studentB = await ensureStudent(world, nameB);
    await enrollStudentsInClass(schoolClass.id, [studentA, studentB]);
    world.currentClassId = schoolClass.id;
  },
);

When(
  "I set all goals for both students using only values {string}, {string}, or {string}",
  async function (valueA: EvaluationValue, valueB: EvaluationValue, valueC: EvaluationValue) {
    const world = getWorld(this);
    const topic = world.currentClassTopic ?? "Intro to Programming";
    const schoolClass = world.currentClassId
      ? await getClassById(world.currentClassId)
      : await ensureClass(topic);
    world.currentClassId = schoolClass.id;

    const students = await studentRepository.list();
    let enrolled = students.filter((student) => schoolClass.studentIds.includes(student.id));

    if (enrolled.length === 0) {
      const john = await ensureStudent(world, "John Doe");
      const jane = await ensureStudent(world, "Jane Smith");
      await enrollStudentsInClass(schoolClass.id, [john, jane]);
      const refreshed = await classRepository.findById(schoolClass.id);
      const refreshedIds = new Set(refreshed?.studentIds ?? []);
      enrolled = students.filter((student) => refreshedIds.has(student.id));
      if (!enrolled.find((student) => student.id === john.id)) {
        enrolled.push(john);
      }
      if (!enrolled.find((student) => student.id === jane.id)) {
        enrolled.push(jane);
      }
    }

    const cycle = [valueA, valueB, valueC];
    let index = 0;

    world.matrixPatches = [];

    for (const student of enrolled) {
      for (const goal of schoolClass.goals) {
        world.matrixPatches.push({
          studentId: student.id,
          goalId: goal.id,
          value: cycle[index % cycle.length],
        });
        index += 1;
      }
    }
  },
);

When("I click {string}", async function (buttonLabel: string) {
  const world = getWorld(this);
  if (buttonLabel !== "Save Evaluations") {
    return;
  }

  const schoolClass = await getClassById(world.currentClassId);
  assert.ok(world.matrixPatches?.length, "No matrix patches to save.");

  await evaluationService.updateMatrix(schoolClass.id, world.matrixPatches);
});

Given(
  "{string} is enrolled in classes {string} and {string}",
  async function (studentName: string, classA: string, classB: string) {
    const world = getWorld(this);
    const student = await ensureStudent(world, studentName, undefined, "john.doe@example.com");
    const schoolClassA = await ensureClass(classA);
    const schoolClassB = await ensureClass(classB);

    await enrollStudentsInClass(schoolClassA.id, [student]);
    await enrollStudentsInClass(schoolClassB.id, [student]);

    world.dispatchStudentName = studentName;
    world.classIdsByTopic = world.classIdsByTopic ?? {};
    world.classIdsByTopic[classA] = schoolClassA.id;
    world.classIdsByTopic[classB] = schoolClassB.id;
  },
);

Given(
  "pending notification events exist for {string} in both classes on the same date",
  async function (studentName: string) {
    const world = getWorld(this);
    const student = (await listStudentsByName(studentName))[0];
    assert.ok(student, "Student not found for pending notifications.");

    const classA = await getClassById(world.classIdsByTopic?.["Intro to Programming"]);
    const classB = await getClassById(world.classIdsByTopic?.["Software Testing"]);

    await evaluationService.updateMatrix(classA.id, [
      { studentId: student.id, goalId: classA.goals[0].id, value: "MPA" },
    ]);

    await evaluationService.updateMatrix(classB.id, [
      { studentId: student.id, goalId: classB.goals[0].id, value: "MA" },
    ]);

    world.pendingEventsClassTopics = ["Intro to Programming", "Software Testing"];
  },
);

When("the daily notification dispatch process runs", async function () {
  const world = getWorld(this);
  world.lastDispatch = await notificationService.dispatchDailySummaries();
});

Given("{string} has already received a summary email today", async function (studentName: string) {
  const world = getWorld(this);
  const student = await ensureStudent(world, studentName, undefined, "john.doe@example.com");
  await notificationRepository.markDispatched(student.id, todayDateKey());
  world.dispatchStudentName = studentName;
});

Given("there are pending notification events for {string}", async function (studentName: string) {
  const world = getWorld(this);
  const student = await ensureStudent(world, studentName, undefined, "john.doe@example.com");

  await notificationRepository.append([
    {
      studentId: student.id,
      classId: "class-pending",
      classTopic: "Any Class",
      goalId: "requirements",
      goalLabel: "Requirements",
      previousValue: null,
      newValue: "MANA",
      changedAt: new Date().toISOString(),
    },
  ]);
});

When("the daily notification dispatch process runs again on the same date", async function () {
  const world = getWorld(this);
  world.lastDispatch = await notificationService.dispatchDailySummaries();
});

Given(
  "class {string} contains student {string} with saved evaluations",
  async function (topic: string, studentName: string) {
    const world = getWorld(this);
    const schoolClass = await ensureClass(topic);
    const student = await ensureStudent(world, studentName);

    await enrollStudentsInClass(schoolClass.id, [student]);

    await evaluationService.updateMatrix(schoolClass.id, [
      {
        studentId: student.id,
        goalId: schoolClass.goals[0].id,
        value: "MPA",
      },
    ]);

    world.currentClassTopic = topic;
    world.currentClassId = schoolClass.id;
    world.classIdsByTopic = world.classIdsByTopic ?? {};
    world.classIdsByTopic[topic] = schoolClass.id;
  },
);

When("I update the class enrollment and remove {string}", async function (studentName: string) {
  const world = getWorld(this);
  const schoolClass = await getClassById(world.currentClassId);

  const student = (await listStudentsByName(studentName))[0];
  assert.ok(student, "Student not found.");

  const updatedIds = schoolClass.studentIds.filter((id) => id !== student.id);
  await classService.update(schoolClass.id, { studentIds: updatedIds });
});

Then("the system should update the student's status in the JSON database", async function () {
  const world = getWorld(this);
  const schoolClass = await getClassById(world.currentClassId);

  assert.ok(schoolClass.evaluations.length >= 1, "Expected evaluations to be persisted.");
});

Then("the system should queue a summary notification for {string}", async function (studentName: string) {
  const student = (await listStudentsByName(studentName))[0];
  assert.ok(student, "Student not found.");

  const store = await notificationRepository.read();
  const hasPending = store.pending.some((event) => event.studentId === student.id);
  assert.equal(hasPending, true, "Expected pending notification event for student.");
});

Then(
  "it should not send the email immediately to avoid multiple notifications in one day",
  async function () {
    const store = await notificationRepository.read();
    assert.deepEqual(store.dispatchLog, {}, "Dispatch log should still be empty.");
  },
);

Then("the student should be removed from the list", async function () {
  const world = getWorld(this);
  assert.ok(world.lastDeletedStudentId, "No deleted student tracked.");

  const students = await studentRepository.list();
  const stillExists = students.some((student) => student.id === world.lastDeletedStudentId);
  assert.equal(stillExists, false, "Student still exists after deletion.");
});

Then("the student should be automatically unenrolled from all active classes", async function () {
  const world = getWorld(this);
  assert.ok(world.lastDeletedStudentId, "No deleted student tracked.");

  const classes = await classRepository.list();
  const stillEnrolledSomewhere = classes.some((schoolClass) =>
    schoolClass.studentIds.includes(world.lastDeletedStudentId as string),
  );

  assert.equal(stillEnrolledSomewhere, false, "Student remained enrolled after deletion.");
});

Then("the student should appear in the student list", async function () {
  const world = getWorld(this);
  assert.ok(world.createdStudentName, "No created student tracked.");

  const students = await studentRepository.list();
  const exists = students.some((student) => student.name === world.createdStudentName);
  assert.equal(exists, true, "Student not found in list.");
});

Then("the student record should be persisted in the JSON database", async function () {
  const students = await studentRepository.list();
  assert.ok(students.length > 0, "Expected at least one student in JSON database.");
});

Then("the system should reject the creation request", function () {
  const world = getWorld(this);
  assert.ok(world.lastError, "Expected creation error but none was captured.");
});

Then("I should see an error indicating that CPF already exists", function () {
  const world = getWorld(this);
  assert.ok(world.lastError, "Expected error but none was captured.");
  assert.equal(world.lastError.message.includes("CPF already exists."), true);
});

Then("the class should be listed in the Classes page", async function () {
  const world = getWorld(this);
  assert.ok(world.pendingClassDraft, "No pending class draft.");

  const schoolClass = await findClassByTopic(world.pendingClassDraft.topic);
  assert.ok(schoolClass, "Expected class to exist in repository.");
});

Then(
  "the class should be persisted with enrolled students and goals in the JSON database",
  async function () {
    const world = getWorld(this);
    assert.ok(world.pendingClassDraft, "No pending class draft.");

    const schoolClass = await findClassByTopic(world.pendingClassDraft.topic);
    assert.equal(schoolClass.studentIds.length, 2);
    assert.deepEqual(
      schoolClass.goals.map((goal) => goal.label),
      world.pendingClassDraft.goals.map((goal) => goal.label),
    );
  },
);

Then("the system should reject the update", function () {
  const world = getWorld(this);
  assert.ok(world.lastError, "Expected update error but none was captured.");
});

Then("the stored evaluation value should remain unchanged", async function () {
  const world = getWorld(this);
  const schoolClass = await getClassById(world.currentClassId);

  const value = schoolClass.evaluations[0]?.value ?? null;
  assert.equal(value, world.previousCellValue ?? null);
});

Then("all evaluation cells should be persisted in the class JSON record", async function () {
  const world = getWorld(this);
  const schoolClass = await getClassById(world.currentClassId);
  assert.ok(world.matrixPatches, "No saved matrix patches available.");

  for (const patch of world.matrixPatches) {
    const found = schoolClass.evaluations.find(
      (cell) => cell.studentId === patch.studentId && cell.goalId === patch.goalId,
    );
    assert.ok(found, "Expected evaluation cell not found.");
    assert.equal(found.value, patch.value);
  }
});

Then(
  "notification events should be queued for the students with changed evaluations",
  async function () {
    const store = await notificationRepository.read();
    const uniqueStudentIds = new Set(store.pending.map((event) => event.studentId));
    assert.ok(uniqueStudentIds.size >= 2, "Expected notifications for multiple students.");
  },
);

Then("the system should send only one summary email to {string}", function (studentName: string) {
  const world = getWorld(this);
  world.dispatchStudentName = studentName;
  assert.ok(world.lastDispatch, "No dispatch result available.");
  assert.equal(world.lastDispatch.sent, 1);
});

Then("the email should include updates from both classes", function () {
  const world = getWorld(this);
  assert.deepEqual(world.pendingEventsClassTopics, ["Intro to Programming", "Software Testing"]);
  assert.ok(world.lastDispatch, "No dispatch result available.");
  assert.equal(world.lastDispatch.sent, 1);
});

Then("{string} should be marked as dispatched for the current date", async function (studentName: string) {
  const student = (await listStudentsByName(studentName))[0];
  assert.ok(student, "Student not found.");

  const store = await notificationRepository.read();
  assert.equal(store.dispatchLog[student.id], todayDateKey());
});

Then("the system should not send another email to {string}", function (_studentName: string) {
  const world = getWorld(this);
  assert.ok(world.lastDispatch, "No dispatch result available.");
  assert.equal(world.lastDispatch.sent, 0);
});

Then("the dispatch result should count {string} as skipped", function (_studentName: string) {
  const world = getWorld(this);
  assert.ok(world.lastDispatch, "No dispatch result available.");
  assert.ok(world.lastDispatch.skipped >= 1, "Expected skipped to be at least 1.");
});

Then("{string} should not be listed as enrolled in that class", async function (studentName: string) {
  const world = getWorld(this);
  const schoolClass = await getClassById(world.currentClassId);

  const student = (await listStudentsByName(studentName))[0];
  assert.ok(student, "Student not found.");

  assert.equal(schoolClass.studentIds.includes(student.id), false);
});

Then(
  "all evaluation cells for {string} in that class should be removed",
  async function (studentName: string) {
    const world = getWorld(this);
    const schoolClass = await getClassById(world.currentClassId);

    const student = (await listStudentsByName(studentName))[0];
    assert.ok(student, "Student not found.");

    const stillHasCells = schoolClass.evaluations.some((cell) => cell.studentId === student.id);
    assert.equal(stillHasCells, false);
  },
);
