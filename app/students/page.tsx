"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Student } from "@/lib/shared/models";

interface StudentFormState {
  name: string;
  cpf: string;
  email: string;
}

const initialForm: StudentFormState = {
  name: "",
  cpf: "",
  email: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StudentFormState>(initialForm);

  async function loadStudents() {
    setLoading(true);
    try {
      const response = await fetch("/api/students");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load students");
      }
      setStudents(data.students);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const endpoint = editingId ? `/api/students/${editingId}` : "/api/students";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save student");
      }
      resetForm();
      await loadStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save student");
    } finally {
      setSaving(false);
    }
  }

  async function removeStudent(id: string) {
    const confirmed = window.confirm("Remove this student?");
    if (!confirmed) {
      return;
    }

    setError("");
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete student");
      }
      await loadStudents();
      if (editingId === id) {
        resetForm();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete student");
    }
  }

  const title = useMemo(
    () => (editingId ? "Update Student" : "Add Student"),
    [editingId],
  );

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Student profile requires name, CPF and email.
          </p>

          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="block text-sm text-slate-700">
              Name
              <input
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
              />
            </label>

            <label className="block text-sm text-slate-700">
              CPF
              <input
                required
                value={form.cpf}
                onChange={(event) => setForm((prev) => ({ ...prev, cpf: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
                placeholder="00000000000"
              />
            </label>

            <label className="block text-sm text-slate-700">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Students</h2>
          {loading ? <p className="mt-4 text-slate-600">Loading...</p> : null}

          {!loading && students.length === 0 ? (
            <p className="mt-4 text-slate-600">No students yet.</p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-sm text-slate-600">CPF: {student.cpf}</p>
                  <p className="text-sm text-slate-600">{student.email}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(student.id);
                      setForm({
                        name: student.name,
                        cpf: student.cpf,
                        email: student.email,
                      });
                    }}
                    className="rounded-full bg-cyan-100 px-3 py-1.5 text-sm font-semibold text-cyan-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStudent(student.id)}
                    className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
