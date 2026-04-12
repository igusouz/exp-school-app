"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import {
  EVALUATION_VALUES,
  EvaluationCell,
  EvaluationValue,
  Goal,
  Student,
} from "@/lib/shared/models";

interface EvaluationClassResponse {
  id: string;
  topic: string;
  year: number;
  semester: number;
  studentIds: string[];
  goals: Goal[];
  evaluations: EvaluationCell[];
}

export default function EvaluationGridPage({
}: {
  params: { id: string };
}) {
  const params = useParams<{ id: string }>();
  const [classId, setClassId] = useState("");
  const [schoolClass, setSchoolClass] = useState<EvaluationClassResponse | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [matrix, setMatrix] = useState<Record<string, EvaluationValue>>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const id = params.id;
        if (!mounted || !id) {
          return;
        }
        setClassId(id);

        const [evaluationResponse, studentsResponse] = await Promise.all([
          fetch(`/api/classes/${id}/evaluations`),
          fetch("/api/students"),
        ]);

        const evaluationData = await evaluationResponse.json();
        const studentsData = await studentsResponse.json();

        if (!evaluationResponse.ok) {
          throw new Error(evaluationData.error ?? "Failed to load evaluations");
        }
        if (!studentsResponse.ok) {
          throw new Error(studentsData.error ?? "Failed to load students");
        }

        if (!mounted) {
          return;
        }

        setSchoolClass(evaluationData.class as EvaluationClassResponse);
        setStudents(studentsData.students as Student[]);

        const map: Record<string, EvaluationValue> = {};
        for (const cell of (evaluationData.class as EvaluationClassResponse).evaluations) {
          map[`${cell.studentId}:${cell.goalId}`] = cell.value;
        }
        setMatrix(map);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load evaluations");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const enrolledStudents = useMemo(() => {
    if (!schoolClass) {
      return [];
    }
    const idSet = new Set(schoolClass.studentIds);
    return students.filter((student) => idSet.has(student.id));
  }, [schoolClass, students]);

  function setValue(studentId: string, goalId: string, value: EvaluationValue) {
    setMatrix((prev) => ({
      ...prev,
      [`${studentId}:${goalId}`]: value,
    }));
  }

  async function saveAll() {
    if (!schoolClass) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const patches = schoolClass.studentIds.flatMap((studentId) =>
        schoolClass.goals.map((goal) => {
          const key = `${studentId}:${goal.id}`;
          const value = matrix[key] ?? "MANA";
          return {
            studentId,
            goalId: goal.id,
            value,
          };
        }),
      );

      const response = await fetch(`/api/classes/${classId}/evaluations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patches }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save evaluations");
      }

      setNotice(
        "Evaluations saved. Notification events were queued for daily summary emails.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save evaluations");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      {loading ? <p className="text-slate-700">Loading evaluation grid...</p> : null}
      {error ? <p className="text-rose-700">{error}</p> : null}

      {!loading && schoolClass ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{schoolClass.topic}</h2>
              <p className="text-sm text-slate-600">
                Year {schoolClass.year} | Semester {schoolClass.semester}
              </p>
            </div>
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Evaluations"}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-sm font-semibold text-slate-700">
                    Student
                  </th>
                  {schoolClass.goals.map((goal) => (
                    <th
                      key={goal.id}
                      className="px-3 py-2 text-left text-sm font-semibold text-slate-700"
                    >
                      {goal.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {enrolledStudents.map((student) => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 text-sm font-medium text-slate-900">{student.name}</td>
                    {schoolClass.goals.map((goal) => {
                      const key = `${student.id}:${goal.id}`;
                      const value = matrix[key] ?? "MANA";

                      return (
                        <td key={key} className="px-3 py-3">
                          <select
                            value={value}
                            onChange={(event) =>
                              setValue(student.id, goal.id, event.target.value as EvaluationValue)
                            }
                            className="w-full min-w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none ring-cyan-200 focus:ring"
                          >
                            {EVALUATION_VALUES.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
          <p className="mt-3 text-sm text-slate-600">
            Legend: MANA = Goal Not Yet Reached | MPA = Goal Partially Reached | MA = Goal Reached
          </p>
        </section>
      ) : null}
    </AppShell>
  );
}
