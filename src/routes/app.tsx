import { createFileRoute, redirect } from "@tanstack/react-router";
import { GrantChat } from "@/components/grant-chat";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href, mode: "signin" },
      });
    }

    const { data: bp, error: bpError } = await supabase
      .from("business_profiles")
      .select("user_id")
      .eq("user_id", data.session.user.id)
      .maybeSingle();

    // If the table is missing (404) or any other unexpected error, don't block —
    // log and continue so the app stays usable. Missing-row is the only "redirect" case.
    if (bpError) {
      console.warn("[app] business_profiles lookup failed; skipping gate:", bpError.message);
      return;
    }
    if (!bp) {
      throw redirect({ to: "/profile" });
    }
  },
  component: AppPage,
  head: () => ({
    meta: [
      { title: "Chat — GrantScout" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AppPage() {
  return <GrantChat />;
}
