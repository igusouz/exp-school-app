"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { DEFAULT_GOALS } from "@/lib/shared/defaults";
import { SchoolClass, Student } from "@/lib/shared/models";

interface ClassFormState {
  topic: string;
  year: string;
  semester: string;
  studentIds: string[];
  goalsText: string;
}

const initialForm: ClassFormState = {
  topic: "",
  year: String(new Date().getFullYear()),
  semester: "1",
  studentIds: [],
  goalsText: DEFAULT_GOALS.map((goal) => goal.label).join(", "),
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClassFormState>(initialForm);

  async function load() {
    setLoading(true);
    try {
      const [classesResponse, studentsResponse] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/students"),
      ]);

      const classesData = await classesResponse.json();
      const studentsData = await studentsResponse.json();

      if (!classesResponse.ok) {
        throw new Error(classesData.error ?? "Failed to load classes");
      }
      if (!studentsResponse.ok) {
        throw new Error(studentsData.error ?? "Failed to load students");
      }

      setClasses(classesData.classes);
      setStudents(studentsData.students);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const goals = form.goalsText
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .map((label) => ({
        id: label.toLowerCase().replace(/\s+/g, "-"),
        label,
      }));

    try {
      const endpoint = editingId ? `/api/classes/${editingId}` : "/api/classes";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          year: Number(form.year),
          semester: Number(form.semester),
          studentIds: form.studentIds,
          goals,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save class");
      }

      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save class");
    } finally {
      setSaving(false);
    }
  }

  async function removeClass(id: string) {
    if (!window.confirm("Remove this class?")) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to remove class");
      }
      await load();
      if (editingId === id) {
        resetForm();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove class");
    }
  }

  const heading = useMemo(
    () => (editingId ? "Update Class" : "Create Class"),
    [editingId],
  );

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">{heading}</h2>

          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="block text-sm text-slate-700">
              Topic
              <input
                required
                value={form.topic}
                onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm text-slate-700">
                Year
                <input
                  required
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
                />
              </label>

              <label className="block text-sm text-slate-700">
                Semester
                <select
                  value={form.semester}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, semester: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
            </div>

            <label className="block text-sm text-slate-700">
              Goals (comma separated)
              <input
                value={form.goalsText}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, goalsText: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-cyan-200 focus:ring"
                placeholder="Requirements, Testing"
              />
            </label>

            <div>
              <p className="text-sm text-slate-700">Enrolled students</p>
              <div className="mt-2 max-h-44 space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
                {students.length === 0 ? (
                  <p className="text-sm text-slate-500">Create students first.</p>
                ) : (
                  students.map((student) => (
                    <label key={student.id} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.studentIds.includes(student.id)}
                        onChange={(event) => {
                          setForm((prev) => ({
                            ...prev,
                            studentIds: event.target.checked
                              ? [...prev.studentIds, student.id]
                              : prev.studentIds.filter((id) => id !== student.id),
                          }));
                        }}
                      />
                      {student.name}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
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
          <h2 className="text-xl font-semibold text-slate-900">Classes</h2>
          {loading ? <p className="mt-4 text-slate-600">Loading...</p> : null}

          {!loading && classes.length === 0 ? (
            <p className="mt-4 text-slate-600">No classes yet.</p>
          ) : null}

          <ul className="mt-4 space-y-3">
            {classes.map((schoolClass) => (
              <li
                key={schoolClass.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{schoolClass.topic}</p>
                    <p className="text-sm text-slate-600">
                      {schoolClass.year} / Semester {schoolClass.semester}
                    </p>
                    <p className="text-sm text-slate-600">
                      Students: {schoolClass.studentIds.length}
                    </p>
                    <p className="text-sm text-slate-600">
                      Goals: {schoolClass.goals.map((goal) => goal.label).join(", ")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/classes/${schoolClass.id}`}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800"
                    >
                      View
                    </Link>
                    <Link
                      href={`/classes/${schoolClass.id}/evaluations`}
                      className="rounded-full bg-cyan-100 px-3 py-1.5 text-sm font-semibold text-cyan-900"
                    >
                      Evaluations
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(schoolClass.id);
                        setForm({
                          topic: schoolClass.topic,
                          year: String(schoolClass.year),
                          semester: String(schoolClass.semester),
                          studentIds: schoolClass.studentIds,
                          goalsText: schoolClass.goals.map((goal) => goal.label).join(", "),
                        });
                      }}
                      className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeClass(schoolClass.id)}
                      className="rounded-full bg-rose-100 px-3 py-1.5 text-sm font-semibold text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AppShell>
  );
}
