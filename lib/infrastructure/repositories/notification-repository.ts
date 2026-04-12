import { JsonFileStore } from "@/lib/infrastructure/json-file-store";
import { dataPaths } from "@/lib/infrastructure/paths";
import { EvaluationChangeEvent, NotificationsStore } from "@/lib/shared/models";

export class NotificationRepository {
  private readonly store = new JsonFileStore<NotificationsStore>(
    dataPaths.notifications,
    {
      pending: [],
      dispatchLog: {},
    },
  );

  async read(): Promise<NotificationsStore> {
    return this.store.read();
  }

  async append(events: EvaluationChangeEvent[]): Promise<void> {
    if (!events.length) {
      return;
    }
    const data = await this.store.read();
    data.pending.push(...events);
    await this.store.write(data);
  }

  async markDispatched(studentId: string, dispatchDate: string): Promise<void> {
    const data = await this.store.read();
    data.dispatchLog[studentId] = dispatchDate;
    data.pending = data.pending.filter((event) => event.studentId !== studentId);
    await this.store.write(data);
  }
}

export const notificationRepository = new NotificationRepository();
