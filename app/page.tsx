import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DailyDispatchButton } from "@/components/daily-dispatch-button";

const cards = [
  {
    title: "Student Management",
    description: "Create, update and remove student profiles with CPF and email.",
    href: "/students",
  },
  {
    title: "Class Management",
    description: "Manage classes by topic, semester and enrolled student list.",
    href: "/classes",
  },
  {
    title: "Evaluation Grid",
    description: "Open a class and update MANA, MPA or MA in a matrix layout.",
    href: "/classes",
  },
];

export default function Home() {
  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl bg-slate-900 p-8 text-slate-100 shadow-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Next.js App Router</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            School Performance Workspace
          </h2>
          <p className="mt-4 max-w-2xl text-slate-300">
            Clean, file-backed management for students, classes and evaluation goals.
            Updates are persisted as JSON and can trigger one consolidated daily email
            per student.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/students"
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-cyan-300"
            >
              Open Students
            </Link>
            <Link
              href="/classes"
              className="rounded-full border border-slate-500 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Open Classes
            </Link>
          </div>
        </div>

        <DailyDispatchButton />
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-cyan-700 group-hover:text-cyan-900">
              Access module
            </p>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
