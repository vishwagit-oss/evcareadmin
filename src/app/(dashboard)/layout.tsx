import { AuthGuard } from "@/components/AuthGuard";
import { DashboardNav } from "@/components/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="ml-64 min-h-screen p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
