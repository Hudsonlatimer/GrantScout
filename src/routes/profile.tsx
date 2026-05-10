import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import logo from "@/assets/grantbot-logo.png";

const PROVINCES = [
  ["ON", "Ontario"],
  ["QC", "Québec"],
  ["BC", "British Columbia"],
  ["AB", "Alberta"],
  ["MB", "Manitoba"],
  ["SK", "Saskatchewan"],
  ["NB", "New Brunswick"],
  ["NS", "Nova Scotia"],
  ["NL", "Newfoundland and Labrador"],
  ["PE", "Prince Edward Island"],
  ["YT", "Yukon"],
  ["NT", "Northwest Territories"],
  ["NU", "Nunavut"],
] as const;

const INDUSTRIES = [
  "saas",
  "tech",
  "cleantech",
  "biotech",
  "manufacturing",
  "agriculture",
  "agritech",
  "retail",
  "hospitality",
  "construction",
  "professional services",
  "creative",
  "health",
  "energy",
  "transportation",
  "other",
];

const REVENUE_RANGES = [
  ["pre-revenue", "Pre-revenue"],
  ["<100k", "Under $100k"],
  ["100k-1m", "$100k – $1M"],
  ["1m-5m", "$1M – $5M"],
  ["5m-25m", "$5M – $25M"],
  ["25m+", "$25M+"],
] as const;

export const Route = createFileRoute("/profile")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href, mode: "signin" },
      });
    }
  },
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your business — GrantScout" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const formSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(120),
  pitch: z
    .string()
    .trim()
    .min(15, "Give us one sentence about what you do")
    .max(280, "Keep it to one sentence (≤280 chars)"),
  province: z.string().min(2, "Pick a province"),
  industry: z.string().min(1, "Pick an industry"),
  employees: z.coerce.number().int().min(0).max(100000),
  annual_revenue_range: z.string().min(1, "Pick a revenue range"),
  funding_purpose: z.string().trim().min(3, "Tell us what you'd use the money for").max(500),
  woman_owned: z.boolean(),
  indigenous_owned: z.boolean(),
  exports: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  business_name: "",
  pitch: "",
  province: "",
  industry: "",
  employees: 1,
  annual_revenue_range: "",
  funding_purpose: "",
  woman_owned: false,
  indigenous_owned: false,
  exports: false,
};

function ProfilePage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) return;
      const { data, error: fetchErr } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (fetchErr) {
        console.warn("[profile] fetch failed:", fetchErr.message);
        setLoading(false);
        return;
      }
      if (data) {
        setHasExisting(true);
        setValues({
          business_name: data.business_name ?? "",
          pitch: data.pitch ?? "",
          province: data.province ?? "",
          industry: data.industry ?? "",
          employees: data.employees ?? 1,
          annual_revenue_range: data.annual_revenue_range ?? "",
          funding_purpose: data.funding_purpose ?? "",
          woman_owned: !!data.woman_owned,
          indigenous_owned: !!data.indigenous_owned,
          exports: !!data.exports,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = <K extends keyof FormValues>(key: K, v: FormValues[K]) =>
    setValues((s) => ({ ...s, [key]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) throw new Error("Not signed in");

      const { error } = await supabase
        .from("business_profiles")
        .upsert({ user_id: userId, ...parsed.data }, { onConflict: "user_id" });
      if (error) throw error;

      toast.success(hasExisting ? "Profile updated." : "Profile saved.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <img src={logo} alt="" width={28} height={28} className="h-7 w-7" />
            GrantScout
          </Link>
          {hasExisting && (
            <Link to="/app" className="text-sm text-muted-foreground hover:text-foreground">
              Back to chat
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {hasExisting ? "Your business" : "Tell us about your business"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {hasExisting
            ? "Update anything that's changed. Better data means better matches."
            : "We'll use this to match you against real Canadian funding programs. Two minutes."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-6">
          <Field label="Business name" htmlFor="business_name">
            <Input
              id="business_name"
              value={values.business_name}
              onChange={(e) => update("business_name", e.target.value)}
              placeholder="e.g. Northwood Bakery"
              required
            />
          </Field>

          <Field
            label="One sentence about your business"
            htmlFor="pitch"
          >
            <textarea
              id="pitch"
              value={values.pitch}
              onChange={(e) => update("pitch", e.target.value)}
              placeholder="e.g. We make plant-based protein snacks sold to grocery chains across Western Canada."
              maxLength={280}
              rows={2}
              required
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p className={`text-xs ${values.pitch.length >= 260 ? "text-destructive" : values.pitch.length >= 220 ? "text-amber-500" : "text-muted-foreground"}`}>
              {values.pitch.length}/280 — used as context in every chat reply.
            </p>
          </Field>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Province" htmlFor="province">
              <Select value={values.province} onValueChange={(v) => update("province", v)}>
                <SelectTrigger id="province">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Industry" htmlFor="industry">
              <Select value={values.industry} onValueChange={(v) => update("industry", v)}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i.charAt(0).toUpperCase() + i.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Employees (incl. you)" htmlFor="employees">
              <Input
                id="employees"
                type="number"
                min={0}
                max={100000}
                value={values.employees === 0 ? "" : values.employees}
                onChange={(e) => update("employees", e.target.value === "" ? 0 : Number(e.target.value))}
              />
            </Field>

            <Field label="Annual revenue" htmlFor="annual_revenue_range">
              <Select
                value={values.annual_revenue_range}
                onValueChange={(v) => update("annual_revenue_range", v)}
              >
                <SelectTrigger id="annual_revenue_range">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_RANGES.map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="What would you use funding for?" htmlFor="funding_purpose">
            <textarea
              id="funding_purpose"
              value={values.funding_purpose}
              onChange={(e) => update("funding_purpose", e.target.value)}
              placeholder="e.g. Hiring two engineers, exporting to the US, prototyping a clean-tech device"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </Field>

          <fieldset className="space-y-3 rounded-lg border border-border bg-card p-4">
            <legend className="px-1 text-sm font-medium text-foreground">
              Anything that applies (optional)
            </legend>
            <CheckboxRow
              checked={values.woman_owned}
              onChange={(v) => update("woman_owned", v)}
              id="woman_owned"
              label="Majority woman-owned or women-led"
            />
            <CheckboxRow
              checked={values.indigenous_owned}
              onChange={(v) => update("indigenous_owned", v)}
              id="indigenous_owned"
              label="Indigenous-owned"
            />
            <CheckboxRow
              checked={values.exports}
              onChange={(v) => update("exports", v)}
              id="exports"
              label="Exports outside Canada (or planning to)"
            />
          </fieldset>

          <div className="flex items-center justify-end gap-3 pt-2">
            {hasExisting && (
              <Link to="/app">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
            )}
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {hasExisting ? "Save changes" : "Continue to chat"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  id,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}
