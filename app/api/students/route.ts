import { NextRequest } from "next/server";

import { studentService } from "@/lib/application/student-service";
import { fail, ok } from "@/lib/presentation/api-response";

export async function GET() {
  try {
    const students = await studentService.list();
    return ok({ students });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const student = await studentService.create({
      name: body.name,
      cpf: body.cpf,
      email: body.email,
    });
    return ok({ student }, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
