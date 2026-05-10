import { createGroq } from "@ai-sdk/groq";
import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { GRANT_BOT_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { searchGrants } from "@/lib/grants/match";

type BusinessProfile = {
  business_name?: string | null;
  pitch?: string | null;
  province?: string | null;
  industry?: string | null;
  employees?: number | null;
  annual_revenue_range?: string | null;
  funding_purpose?: string | null;
  woman_owned?: boolean | null;
  indigenous_owned?: boolean | null;
  exports?: boolean | null;
};

type ChatRequestBody = {
  messages?: unknown;
  profile?: BusinessProfile | null;
};

function profileFacts(p: BusinessProfile | null | undefined): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.business_name) lines.push(`- Business name: ${p.business_name}`);
  if (p.pitch) lines.push(`- What they do: ${p.pitch}`);
  if (p.province) lines.push(`- Province: ${p.province}`);
  if (p.industry) lines.push(`- Industry: ${p.industry}`);
  if (p.employees != null) lines.push(`- Employees: ${p.employees}`);
  if (p.annual_revenue_range) lines.push(`- Annual revenue: ${p.annual_revenue_range}`);
  if (p.funding_purpose) lines.push(`- Looking to fund: ${p.funding_purpose}`);
  if (p.woman_owned) lines.push(`- Woman-owned business`);
  if (p.indigenous_owned) lines.push(`- Indigenous-owned business`);
  if (p.exports) lines.push(`- Exports / plans to export`);
  return lines.join("\n");
}

function profileSystemBlock(p: BusinessProfile | null | undefined): string {
  const facts = profileFacts(p);
  if (!facts) return "";
  return `\n\nUSER'S BUSINESS PROFILE (already known — DO NOT ask for any of this again):\n${facts}\n\nGround every reply in these facts. Refer to the business by name. When the user asks anything (e.g. "what fits us?"), assume they mean THIS business and call \`lookupGrants\` straight away with their province / industry.`;
}

function profileTurnReminder(p: BusinessProfile | null | undefined): string {
  const facts = profileFacts(p);
  if (!facts) return "";
  return `Reminder — you are advising this business. Use these facts in your reply (refer to the business by name; do not ask for any of it):\n${facts}`;
}

const lookupGrants = tool({
  description:
    "Search the curated database of Canadian government funding programs. ALWAYS call this before recommending any program — only programs returned by this tool are real and have verified URLs. Pass the user's province (region) and a broad funding type. Don't over-constrain — the tool is designed to gracefully widen if too narrow.",
  inputSchema: z.object({
    region: z
      .string()
      .optional()
      .describe('Two-letter province code (ON, QC, BC, AB, SK, MB, NB, NL, NS, PE, YT, NT, NU) or "federal".'),
    fundingType: z
      .enum(["grant", "loan", "tax_credit", "wage_subsidy", "equity", "any"])
      .optional()
      .describe('Use "any" by default unless the user explicitly asked for one type.'),
    industry: z
      .string()
      .optional()
      .describe('Optional short industry tag, e.g. "tech", "manufacturing", "cleantech", "saas".'),
  }),
  execute: async (input) => {
    const programs = searchGrants({
      region: input.region as never,
      fundingType: input.fundingType,
      industry: input.industry,
    });
    return {
      count: programs.length,
      programs: programs.map((p) => ({
        id: p.id,
        name: p.name,
        level: p.level,
        type: p.type,
        maxAmount: p.maxAmount ?? "varies",
        industries: p.industries,
        fundingFor: p.fundingFor,
        who: p.who,
        what: p.what,
        url: p.url,
      })),
    };
  },
});

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response("GROQ_API_KEY is not configured", { status: 500 });
        }

        const { messages, profile } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("messages array required", { status: 400 });
        }

        const groq = createGroq({ apiKey });
        const model = groq("llama-3.3-70b-versatile");

        const system = GRANT_BOT_SYSTEM_PROMPT + profileSystemBlock(profile);

        const baseMessages = await convertToModelMessages(messages as UIMessage[]);
        const reminder = profileTurnReminder(profile);

        // Inject the profile facts as a system reminder right before the user's
        // most recent turn — keeps the company context in the model's foreground
        // attention every single message instead of fading after a long thread.
        const augmented =
          reminder && baseMessages.length > 0
            ? [
                ...baseMessages.slice(0, -1),
                { role: "system" as const, content: reminder },
                baseMessages[baseMessages.length - 1],
              ]
            : baseMessages;

        try {
          const result = streamText({
            model,
            system,
            messages: augmented,
            tools: { lookupGrants },
            stopWhen: stepCountIs(4),
            temperature: 0.2,
            maxOutputTokens: 900,
          });
          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
          });
        } catch (err) {
          console.error("Chat error:", err);
          return new Response(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
