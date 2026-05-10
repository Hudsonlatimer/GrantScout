import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";

export type ChatThread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const blankThread = (id?: string): ChatThread => ({
  id: id ?? newId(),
  title: "New conversation",
  updatedAt: Date.now(),
  messages: [],
});

const deriveTitle = (currentTitle: string, messages: UIMessage[]): string => {
  if (currentTitle !== "New conversation") return currentTitle;
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return currentTitle;
  const text = firstUser.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join(" ")
    .trim();
  if (!text) return currentTitle;
  return text.slice(0, 50) + (text.length > 50 ? "…" : "");
};

export function useThreads() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load — fetch threads for the current user, or seed one if empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("chat_threads")
        .select("id, title, messages, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.warn("[use-threads] load failed:", error.message);
        setLoading(false);
        return;
      }

      const list: ChatThread[] = (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: new Date(r.updated_at).getTime(),
        messages: (r.messages as unknown as UIMessage[]) ?? [],
      }));

      if (list.length === 0) {
        const seed = blankThread();
        const { error: insertErr } = await supabase.from("chat_threads").insert({
          id: seed.id,
          user_id: userId,
          title: seed.title,
          messages: [],
        });
        if (insertErr) console.warn("[use-threads] seed insert failed:", insertErr.message);
        if (!cancelled) {
          setThreads([seed]);
          setActiveId(seed.id);
        }
      } else {
        setThreads(list);
        setActiveId(list[0].id);
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeThread = threads.find((t) => t.id === activeId) ?? null;

  const createThread = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id;
    if (!userId) return null;
    const t = blankThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    const { error } = await supabase.from("chat_threads").insert({
      id: t.id,
      user_id: userId,
      title: t.title,
      messages: [],
    });
    if (error) console.warn("[use-threads] create failed:", error.message);
    return t.id;
  }, []);

  const deleteThread = useCallback(
    async (id: string) => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) return;

      // Optimistic local delete + replacement-if-empty.
      let replacement: ChatThread | null = null;
      setThreads((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        if (filtered.length === 0) {
          replacement = blankThread();
          setActiveId(replacement.id);
          return [replacement];
        }
        if (id === activeId) setActiveId(filtered[0].id);
        return filtered;
      });

      const { error: delErr } = await supabase.from("chat_threads").delete().eq("id", id);
      if (delErr) console.warn("[use-threads] delete failed:", delErr.message);

      if (replacement) {
        const r = replacement as ChatThread;
        const { error: insErr } = await supabase.from("chat_threads").insert({
          id: r.id,
          user_id: userId,
          title: r.title,
          messages: [],
        });
        if (insErr) console.warn("[use-threads] replacement insert failed:", insErr.message);
      }
    },
    [activeId],
  );

  const updateThreadMessages = useCallback(async (id: string, messages: UIMessage[]) => {
    let nextTitle: string | undefined;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const title = deriveTitle(t.title, messages);
        if (title !== t.title) nextTitle = title;
        return { ...t, messages, title, updatedAt: Date.now() };
      }),
    );

    const update: { messages: UIMessage[]; title?: string } = { messages };
    if (nextTitle) update.title = nextTitle;
    const { error } = await supabase.from("chat_threads").update(update).eq("id", id);
    if (error) console.warn("[use-threads] update failed:", error.message);
  }, []);

  return {
    threads,
    activeId: activeThread?.id ?? null,
    activeThread,
    loading,
    setActiveId,
    createThread,
    deleteThread,
    updateThreadMessages,
  };
}
