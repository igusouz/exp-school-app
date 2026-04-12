import { NextRequest } from "next/server";

import { classService } from "@/lib/application/class-service";
import { fail, ok } from "@/lib/presentation/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const schoolClass = await classService.getById(id);
    return ok({ class: schoolClass });
  } catch (error) {
    return fail(error, 404);
  }
}

export async function PUT(request: NextRequest, context: Params) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const schoolClass = await classService.update(id, {
      topic: body.topic,
      year: body.year !== undefined ? Number(body.year) : undefined,
      semester: body.semester !== undefined ? Number(body.semester) : undefined,
      studentIds: Array.isArray(body.studentIds) ? body.studentIds : undefined,
      goals: Array.isArray(body.goals) ? body.goals : undefined,
    });
    return ok({ class: schoolClass });
  } catch (error) {
    return fail(error, 400);
  }
}

export async function DELETE(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await classService.remove(id);
    return ok({ success: true });
  } catch (error) {
    return fail(error, 404);
  }
}
