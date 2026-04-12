import { NextRequest } from "next/server";

import { classService } from "@/lib/application/class-service";
import { fail, ok } from "@/lib/presentation/api-response";

export async function GET() {
  try {
    const classes = await classService.list();
    return ok({ classes });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schoolClass = await classService.create({
      topic: body.topic,
      year: Number(body.year),
      semester: Number(body.semester),
      studentIds: Array.isArray(body.studentIds) ? body.studentIds : [],
      goals: Array.isArray(body.goals) ? body.goals : undefined,
    });

    return ok({ class: schoolClass }, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
