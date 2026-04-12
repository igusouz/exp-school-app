import { classRepository } from "@/lib/infrastructure/repositories/class-repository";
import { studentRepository } from "@/lib/infrastructure/repositories/student-repository";
import { Student } from "@/lib/shared/models";
import { isValidCpf, isValidEmail, normalizeCpf } from "@/lib/application/validation";

export class StudentService {
  async list(): Promise<Student[]> {
    return studentRepository.list();
  }

  async create(payload: { name: string; cpf: string; email: string }): Promise<Student> {
    const name = payload.name.trim();
    const email = payload.email.trim().toLowerCase();
    const cpf = normalizeCpf(payload.cpf);

    if (!name) {
      throw new Error("Student name is required.");
    }
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format.");
    }
    if (!isValidCpf(cpf)) {
      throw new Error("CPF must contain 11 digits.");
    }

    if (await studentRepository.findByEmail(email)) {
      throw new Error("Email already exists.");
    }
    if (await studentRepository.findByCpf(cpf)) {
      throw new Error("CPF already exists.");
    }

    return studentRepository.create({ name, email, cpf });
  }

  async update(
    id: string,
    payload: Partial<{ name: string; cpf: string; email: string }>,
  ): Promise<Student> {
    const current = await studentRepository.findById(id);
    if (!current) {
      throw new Error("Student not found.");
    }

    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const cpf = payload.cpf ? normalizeCpf(payload.cpf) : undefined;

    if (name !== undefined && !name) {
      throw new Error("Student name is required.");
    }
    if (email !== undefined && !isValidEmail(email)) {
      throw new Error("Invalid email format.");
    }
    if (cpf !== undefined && !isValidCpf(cpf)) {
      throw new Error("CPF must contain 11 digits.");
    }

    if (email && email !== current.email) {
      const other = await studentRepository.findByEmail(email);
      if (other && other.id !== id) {
        throw new Error("Email already exists.");
      }
    }

    if (cpf && cpf !== current.cpf) {
      const other = await studentRepository.findByCpf(cpf);
      if (other && other.id !== id) {
        throw new Error("CPF already exists.");
      }
    }

    const updated = await studentRepository.update(id, {
      name,
      email,
      cpf,
    });

    if (!updated) {
      throw new Error("Student not found.");
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await studentRepository.remove(id);
    if (!removed) {
      throw new Error("Student not found.");
    }
    await classRepository.removeStudentFromAllClasses(id);
  }
}

export const studentService = new StudentService();
