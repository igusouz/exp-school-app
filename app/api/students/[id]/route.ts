import { NextRequest } from "next/server";

import { studentService } from "@/lib/application/student-service";
import { fail, ok } from "@/lib/presentation/api-response";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, context: Params) {
  try {
    const body = await request.json();
    const { id } = await context.params;
    const student = await studentService.update(id, {
      name: body.name,
      cpf: body.cpf,
      email: body.email,
    });
    return ok({ student });
  } catch (error) {
    return fail(error, 400);
  }
}

export async function DELETE(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await studentService.remove(id);
    return ok({ success: true });
  } catch (error) {
    return fail(error, 404);
  }
}
