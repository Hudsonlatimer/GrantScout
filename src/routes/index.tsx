import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/grantbot-logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "GrantScout — Canadian small business grants, matched to you" },
      {
        name: "description",
        content:
          "Tell us about your business and we'll match you with real federal and provincial Canadian grants, tax credits, and wage subsidies.",
      },
    ],
  }),
});

function Landing() {
  const { session, loading } = useAuth();
  const isAuthed = !loading && !!session;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="" width={32} height={32} className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight">GrantScout</span>
          </Link>
          <nav className="flex items-center gap-2">
            {isAuthed ? (
              <Link to="/app">
                <Button size="sm" className="gap-1.5">
                  Open app
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signin", redirect: "/app" }}>
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signup", redirect: "/app" }}>
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 40% at 50% 0%, oklch(0.65 0.22 30 / 0.18), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-16 text-center md:px-6 md:pb-28 md:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Federal · Provincial · Municipal
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            There's probably money out there{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-hero)" }}
            >
              with your name on it
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Hundreds of Canadian grants, tax credits, and wage subsidies exist — most
            businesses never find the ones they qualify for. Tell us about yours and
            we'll do the digging.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Link to="/app">
                <Button size="lg" className="gap-2">
                  Open the app
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signup", redirect: "/app" }}>
                  <Button size="lg" className="gap-2">
                    Find my grants
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth" search={{ mode: "signin", redirect: "/app" }}>
                  <Button size="lg" variant="ghost">
                    I already have an account
                  </Button>
                </Link>
              </>
            )}
          </div>
          {!isAuthed && (
            <p className="mt-3 text-xs text-muted-foreground">Free to try. No credit card.</p>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px overflow-hidden border-x border-border bg-border md:grid-cols-3">
          <Feature
            icon={<Target className="h-5 w-5" />}
            title="Real programs, not generic advice"
            body="We know CDAP, SR&ED, IRAP, CanExport, BDC, Investissement Québec, OCI, Innovate BC — and we'll tell you straight when we're not sure."
          />
          <Feature
            icon={<MapPin className="h-5 w-5" />}
            title="Federal + every province"
            body="Federal programs plus the big provincial ones — Ontario, Quebec, BC, Alberta, the Atlantic provinces, and the territories."
          />
          <Feature
            icon={<Check className="h-5 w-5" />}
            title="Honest about eligibility"
            body="A few quick questions, then a shortlist of programs that actually fit — with deadlines and links so you can verify."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            We know the programs that actually pay out
          </h2>
          <p className="mt-3 text-muted-foreground">
            From small four-figure grants to seven-figure innovation funds.
          </p>
        </div>
        <div className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2">
          {[
            "CDAP",
            "SR&ED",
            "IRAP",
            "CanExport",
            "Canada Job Grant",
            "Strategic Innovation Fund",
            "FedDev Ontario",
            "FedNor",
            "PacifiCan",
            "BDC",
            "OCI",
            "NOHFC",
            "Investissement Québec",
            "Innovate BC",
            "Alberta Innovates",
            "ACOA",
          ].map((p) => (
            <span
              key={p}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground/80"
            >
              {p}
            </span>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Stop scrolling government websites.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Two minutes describing your business gets you a shortlist worth applying to.
          </p>
          <div className="mt-8">
            <Link to={isAuthed ? "/app" : "/auth"} search={isAuthed ? undefined : { mode: "signup", redirect: "/app" }}>
              <Button size="lg" className="gap-2">
                {isAuthed ? "Open the app" : "Find my grants"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" width={20} height={20} className="h-5 w-5" />
            <span>GrantScout</span>
          </div>
          <p>Always confirm program details on the official government site.</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-background p-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
