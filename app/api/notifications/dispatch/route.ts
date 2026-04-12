import { notificationService } from "@/lib/application/notification-service";
import { fail, ok } from "@/lib/presentation/api-response";

export async function POST() {
  try {
    const result = await notificationService.dispatchDailySummaries();
    return ok(result);
  } catch (error) {
    return fail(error, 500);
  }
}
