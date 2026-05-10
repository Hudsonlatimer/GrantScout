import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Plus, Trash2, MessageSquare, Pencil, Menu } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useThreads } from "@/hooks/use-threads";
import { useBusinessProfile, type BusinessProfile } from "@/hooks/use-business-profile";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import logo from "@/assets/grantbot-logo.png";

const SUGGESTIONS = [
  "What grants fit my business right now?",
  "Any tax credits I should know about?",
  "What about hiring or wage subsidies?",
  "Are there programs for exporting to the US?",
];

function ChatWindow({
  threadId,
  initialMessages,
  onMessagesChange,
  profile,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  onMessagesChange: (messages: UIMessage[]) => void;
  profile: BusinessProfile | null;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { profile },
      }),
    [profile],
  );
  const [seedMessages] = useState(initialMessages);
  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: seedMessages,
    transport,
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const onMessagesChangeRef = useRef(onMessagesChange);
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  useEffect(() => {
    if (status === "streaming" || status === "submitted") return;
    onMessagesChangeRef.current(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (status === "ready") textareaRef.current?.focus();
  }, [status, threadId]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = ({ text }: { text: string }) => {
    if (!text.trim() || isLoading) return;
    sendMessage({ text: text.trim() });
  };

  const handleSuggestion = (text: string) => {
    if (isLoading) return;
    sendMessage({ text });
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 md:px-6">
          {messages.length === 0 ? (
            <ConversationEmptyState className="border-none">
              <img
                src={logo}
                alt=""
                width={72}
                height={72}
                className="mb-2 h-18 w-18"
              />
              <div className="space-y-2 max-w-xl">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {profile?.business_name
                    ? `Hey — let's find funding for ${profile.business_name}`
                    : "Hey — let's find funding"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  I'll search Canadian federal and provincial programs against your
                  profile. Ask anything below or pick a starter.
                </p>
              </div>
              <div className="mt-4 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-foreground/80 transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            <>
              {messages.map((m) => {
                const text = m.parts
                  .map((p) => (p.type === "text" ? p.text : ""))
                  .join("");
                if (!text && m.role === "assistant") return null;
                return (
                  <Message key={m.id} from={m.role}>
                    {m.role === "user" ? (
                      <MessageContent className="bg-[var(--chat-user-bg)] text-[var(--chat-user-fg)]">
                        <p className="whitespace-pre-wrap">{text}</p>
                      </MessageContent>
                    ) : (
                      <MessageContent className="bg-transparent p-0 text-foreground">
                        <MessageResponse
                          parseIncompleteMarkdown
                          isAnimating={status === "streaming"}
                        >
                          {text || ""}
                        </MessageResponse>
                      </MessageContent>
                    )}
                  </Message>
                );
              })}
              {status === "submitted" && (
                <Message from="assistant">
                  <MessageContent className="bg-transparent p-0">
                    <Shimmer>Searching grant programs…</Shimmer>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
          {error && (
            <div className="mx-auto max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl px-4 pb-6">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ask about funding, tax credits, hiring subsidies…"
            disabled={isLoading}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={isLoading} size="icon-sm" />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          I match against a curated list. Always verify deadlines and amounts on the official site.
        </p>
      </div>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: BusinessProfile | null }) {
  if (!profile) return null;
  const items: string[] = [];
  if (profile.province) items.push(profile.province);
  if (profile.industry) items.push(profile.industry);
  if (profile.employees != null) items.push(`${profile.employees} ppl`);
  if (profile.annual_revenue_range) items.push(profile.annual_revenue_range);

  return (
    <div className="mx-3 mb-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sidebar-foreground">
            {profile.business_name || "Your business"}
          </div>
          {items.length > 0 && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {items.join(" · ")}
            </div>
          )}
        </div>
        <Link
          to="/profile"
          aria-label="Edit profile"
          className="rounded p-1 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export function GrantChat() {
  const {
    threads,
    activeId,
    activeThread,
    loading: threadsLoading,
    setActiveId,
    createThread,
    deleteThread,
    updateThreadMessages,
  } = useThreads();

  const { profile, loading: profileLoading } = useBusinessProfile();

  if (threadsLoading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading your workspace…
        </div>
      </div>
    );
  }

  if (!activeThread || !activeId) return null;

  return (
    <div className="grid h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
      <aside className="hidden flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
          <div>
            <Link to="/" className="text-sm font-semibold text-sidebar-foreground">
              GrantScout
            </Link>
            <div className="text-xs text-muted-foreground">Canadian grants, matched</div>
          </div>
        </div>

        <ProfileSummary profile={profile} />

        <div className="px-3">
          <Button
            onClick={createThread}
            className="w-full justify-start gap-2"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
        </div>
        <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {threads.map((t) => {
            const isActive = t.id === activeId;
            return (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className="flex flex-1 items-center gap-2 truncate text-left"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="truncate">{t.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteThread(t.id)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground">
          Synced to your account.
        </div>
      </aside>

      <main className="flex min-h-0 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-6">
          {/* Mobile: hamburger to open thread drawer */}
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Conversations</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="px-4 pt-4 pb-2">
                  <SheetTitle className="flex items-center gap-2 text-sm">
                    <img src={logo} alt="" width={20} height={20} className="h-5 w-5" />
                    Conversations
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 pb-2">
                  <Button onClick={createThread} className="w-full justify-start gap-2" variant="default" size="sm">
                    <Plus className="h-4 w-4" />
                    New conversation
                  </Button>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
                  {threads.map((t) => {
                    const isActive = t.id === activeId;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveId(t.id)}
                          className="flex flex-1 items-center gap-2 truncate text-left"
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                          <span className="truncate">{t.title}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteThread(t.id)}
                          className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
            <span className="max-w-[160px] truncate text-sm font-medium">{activeThread.title}</span>
          </div>

          <div className="hidden truncate text-sm font-medium text-foreground/80 md:block">
            {activeThread.title}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="hidden md:inline">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            <UserMenu />
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <ChatWindow
            key={activeId}
            threadId={activeId}
            initialMessages={activeThread.messages}
            onMessagesChange={(msgs) => updateThreadMessages(activeId, msgs)}
            profile={profile}
          />
        </div>
      </main>
    </div>
  );
}
