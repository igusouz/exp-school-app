import { notificationRepository } from "@/lib/infrastructure/repositories/notification-repository";
import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { studentRepository } from "@/lib/infrastructure/repositories/student-repository";
import { sendEmail } from "@/lib/infrastructure/email/mailer";
import { EvaluationChangeEvent } from "@/lib/shared/models";
import { todayDateKey } from "@/lib/application/validation";

export class NotificationService {
  async recordEvaluationChanges(changes: EvaluationChangeEvent[]): Promise<void> {
    await notificationRepository.append(changes);
  }

  async dispatchDailySummaries(): Promise<{ sent: number; skipped: number }> {
    const data = await notificationRepository.read();
    const students = await studentRepository.list();
    const classes = await classRepository.list();
    const today = todayDateKey();

    const changesByStudent = new Map<string, EvaluationChangeEvent[]>();
    for (const event of data.pending) {
      const studentEvents = changesByStudent.get(event.studentId) ?? [];
      studentEvents.push(event);
      changesByStudent.set(event.studentId, studentEvents);
    }

    let sent = 0;
    let skipped = 0;

    for (const [studentId, events] of changesByStudent.entries()) {
      if (data.dispatchLog[studentId] === today) {
        skipped += 1;
        continue;
      }

      const student = students.find((item) => item.id === studentId);
      if (!student) {
        await notificationRepository.markDispatched(studentId, today);
        skipped += 1;
        continue;
      }

      const lines: string[] = [];
      lines.push(`Hello ${student.name},`);
      lines.push("");
      lines.push("Here is your daily evaluation summary:");
      lines.push("");

      const classMap = new Map<string, EvaluationChangeEvent[]>();
      for (const event of events) {
        const group = classMap.get(event.classId) ?? [];
        group.push(event);
        classMap.set(event.classId, group);
      }

      for (const [classId, classEvents] of classMap.entries()) {
        const schoolClass = classes.find((item) => item.id === classId);
        const classLabel = schoolClass
          ? `${schoolClass.topic} (${schoolClass.year}/${schoolClass.semester})`
          : classEvents[0].classTopic;

        lines.push(`Class: ${classLabel}`);
        for (const item of classEvents) {
          const before = item.previousValue ?? "none";
          lines.push(`- ${item.goalLabel}: ${before} -> ${item.newValue}`);
        }
        lines.push("");
      }

      lines.push("Regards,");
      lines.push("School Evaluation Team");

      await sendEmail({
        to: student.email,
        subject: `Daily Evaluation Summary - ${today}`,
        text: lines.join("\n"),
      });

      await notificationRepository.markDispatched(studentId, today);
      sent += 1;
    }

    return { sent, skipped };
  }
}

export const notificationService = new NotificationService();
