import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/ui/logout-button";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: "🏠" },
  { href: "/cv", label: "Mi CV", icon: "📄" },
  { href: "/jobs", label: "Vacantes", icon: "🔍" },
  { href: "/linkedin", label: "LinkedIn", icon: "💼" },
  { href: "/coach", label: "Coach", icon: "🤖" },
  { href: "/applications", label: "Pipeline", icon: "📊" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col fixed h-full z-10">
        <div className="p-4 border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg">CareerPilot</span>
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">Tu coach con IA</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate px-3 mb-2">{user.email}</p>
          <LogoutButton />
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="ml-56 flex-1 p-6 min-h-screen">{children}</main>
    </div>
  );
}
