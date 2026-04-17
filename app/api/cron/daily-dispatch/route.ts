import { NextRequest } from "next/server";

import { notificationService } from "@/lib/application/notification-service";
import { fail, ok } from "@/lib/presentation/api-response";

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return fail("Unauthorized cron request.", 401);
  }

  try {
    const result = await notificationService.dispatchDailySummaries();
    return ok(result);
  } catch (error) {
    return fail(error, 500);
  }
}
