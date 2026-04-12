"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { SchoolClass, Student } from "@/lib/shared/models";

export default function ClassDetailsPage({
}: {
  params: { id: string };
}) {
  const params = useParams<{ id: string }>();
  const [classId, setClassId] = useState("");
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const [classResponse, studentsResponse] = await Promise.all([
          fetch(`/api/classes/${id}`),
          fetch("/api/students"),
        ]);

        const classData = await classResponse.json();
        const studentsData = await studentsResponse.json();

        if (!classResponse.ok) {
          throw new Error(classData.error ?? "Failed to load class");
        }
        if (!studentsResponse.ok) {
          throw new Error(studentsData.error ?? "Failed to load students");
        }

        if (!mounted) {
          return;
        }

        setSchoolClass(classData.class);
        setStudents(studentsData.students);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Failed to load class");
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

  return (
    <AppShell>
      {loading ? <p className="text-slate-700">Loading class data...</p> : null}
      {error ? <p className="text-rose-700">{error}</p> : null}

      {!loading && !error && schoolClass ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Class</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{schoolClass.topic}</h2>
            <p className="mt-1 text-slate-600">
              Year {schoolClass.year} | Semester {schoolClass.semester}
            </p>
            <p className="mt-3 text-slate-600">
              Goals: {schoolClass.goals.map((goal) => goal.label).join(", ")}
            </p>

            <Link
              href={`/classes/${classId}/evaluations`}
              className="mt-5 inline-flex rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
            >
              Open Evaluation Grid
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">Enrolled Students</h3>
            {enrolledStudents.length === 0 ? (
              <p className="mt-3 text-slate-600">No enrolled students.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {enrolledStudents.map((student) => (
                  <li key={student.id} className="rounded-lg border border-slate-200 p-3">
                    <p className="font-semibold text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-600">{student.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
