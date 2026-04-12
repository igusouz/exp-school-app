import { Navigation } from "@/components/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_30%,#ecfeff_100%)]">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(15,23,42,0.03),transparent_35%,rgba(8,145,178,0.08))]" />
      <Navigation />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
