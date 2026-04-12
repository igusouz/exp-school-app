import { NextRequest } from "next/server";

import { classService } from "@/lib/application/class-service";
import { evaluationService } from "@/lib/application/evaluation-service";
import { fail, ok } from "@/lib/presentation/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const schoolClass = await classService.getById(id);
    return ok({
      class: {
        id: schoolClass.id,
        topic: schoolClass.topic,
        year: schoolClass.year,
        semester: schoolClass.semester,
        studentIds: schoolClass.studentIds,
        goals: schoolClass.goals,
        evaluations: schoolClass.evaluations,
      },
    });
  } catch (error) {
    return fail(error, 404);
  }
}

export async function PUT(request: NextRequest, context: Params) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const evaluations = await evaluationService.updateMatrix(
      id,
      Array.isArray(body.patches) ? body.patches : [],
    );
    return ok({ evaluations });
  } catch (error) {
    return fail(error, 400);
  }
}
