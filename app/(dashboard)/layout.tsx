import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "CV";

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Sidebar email={user.email ?? ""} initials={initials} />

      {/* Contenido principal: deja espacio para el sidebar en desktop y el topbar en móvil */}
      <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
