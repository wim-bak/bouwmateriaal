import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Grid2x2,
  FileDown,
  Printer,
  Building2,
  HelpCircle,
  AlertTriangle,
  Search,
  Lightbulb,
  Target,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { Navbar, Footer } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useResult } from "@/lib/result-context";
import { iconForCategory, priorityStyle, maturityStyle } from "@/lib/opp-meta";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { KansenkaartResult, Opportunity } from "@/lib/types";

const SCORE_LABELS: [keyof Opportunity["scores"], string][] = [
  ["value", "Waarde"],
  ["feasibility", "Haalbaarheid"],
  ["dataNeed", "Databehoefte"],
  ["wow", "Wow-factor"],
];

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <Progress value={score * 10} className="h-2 flex-1" />
      <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
        {score}
      </span>
    </div>
  );
}

const LOADING_STEPS: { icon: typeof Search; label: string; detail: string; duration: number }[] = [
  {
    icon: Search,
    label: "Materiaal analyseren",
    detail: "Eigenschappen, ketenrol en klantvragen in kaart brengen",
    duration: 12,
  },
  {
    icon: Lightbulb,
    label: "Kansen genereren",
    detail: "Vijf AI-toepassingen met scores en voorbeelden formuleren",
    duration: 28,
  },
  {
    icon: Target,
    label: "Prioriteiten bepalen",
    detail: "Waarde en haalbaarheid tegen elkaar afwegen",
    duration: 14,
  },
  {
    icon: FileText,
    label: "Marktcontext toevoegen",
    detail: "Bestaande oplossingen en witte vlekken in kaart brengen",
    duration: 16,
  },
];

function LoadingState() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  // Determine current step based on elapsed time. Cumulative durations.
  const cumulative: number[] = [];
  LOADING_STEPS.reduce((acc, s, i) => {
    const total = acc + s.duration;
    cumulative[i] = total;
    return total;
  }, 0);
  const totalExpected = cumulative[cumulative.length - 1];

  // While still generating, never mark the last step as "done" — it completes only when result arrives.
  let activeIdx = LOADING_STEPS.findIndex((_, i) => elapsed < cumulative[i]);
  if (activeIdx === -1) activeIdx = LOADING_STEPS.length - 1;

  const progressPct = Math.min(95, Math.round((elapsed / totalExpected) * 100));

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-10 flex flex-col items-center text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-highlight/15 text-highlight">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </span>
        <h1 className="text-xl font-bold text-foreground">AI-Kansenkaart wordt samengesteld</h1>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Dit duurt gemiddeld 60 tot 90 seconden. Blijf op deze pagina — de kaart verschijnt automatisch.
        </p>
      </div>

      {/* Overall progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">{elapsed}s verstreken</span>
          <span className="tabular-nums">~{totalExpected}s verwacht</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-highlight transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            data-testid="progress-bar"
          />
        </div>
      </div>

      {/* Steps */}
      <ol className="space-y-3" data-testid="loading-steps">
        {LOADING_STEPS.map((step, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          const StepIcon = step.icon;
          return (
            <li
              key={i}
              data-testid={`step-${i}`}
              data-status={isDone ? "done" : isActive ? "active" : "pending"}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-all duration-500 ${
                isActive
                  ? "border-highlight/40 bg-highlight/5 shadow-sm"
                  : isDone
                    ? "border-groen/30 bg-groen/5"
                    : "border-border bg-card opacity-60"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isDone
                    ? "bg-groen/20 text-groen"
                    : isActive
                      ? "bg-highlight/20 text-highlight"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? (
                  <Check className="h-5 w-5" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    isDone || isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {elapsed > totalExpected + 15 && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Het duurt iets langer dan gemiddeld. Even geduld — we ronden af.
        </p>
      )}
    </div>
  );
}

function PriorityMatrix({ opportunities }: { opportunities: Opportunity[] }) {
  const quadrants = [
    { title: "Strategische kansen", sub: "Hoge waarde · lagere haalbaarheid", cls: "bg-highlight/[0.14]" },
    { title: "Quick wins", sub: "Hoge waarde · hoge haalbaarheid", cls: "bg-groen/[0.14]" },
    { title: "Niet direct relevant", sub: "Lage waarde · lagere haalbaarheid", cls: "bg-grijs/[0.12]" },
    { title: "Later onderzoeken", sub: "Lage waarde · hoge haalbaarheid", cls: "bg-lichtblauw/[0.14]" },
  ];
  return (
    <div className="grid gap-8 md:grid-cols-[400px,1fr] md:items-center">
      <div className="mx-auto w-full max-w-[400px] px-5 pb-6">
        <div className="relative aspect-square w-full rounded-xl border border-border bg-card p-0">
          {/* quadrant backgrounds */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 overflow-hidden rounded-xl">
            {quadrants.map((q, i) => (
              <div key={i} className={`relative border border-border/60 ${q.cls} p-2`}>
                <p className="text-[10px] font-bold leading-tight text-foreground/80">{q.title}</p>
                <p className="text-[9px] leading-tight text-muted-foreground">{q.sub}</p>
              </div>
            ))}
          </div>
          {/* axis labels */}
          <span className="absolute -left-[26px] top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Waarde →
          </span>
          <span className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Haalbaarheid →
          </span>
          {/* dots */}
          {opportunities.map((o, i) => {
            const ps = priorityStyle(o.priority);
            const left = Math.min(92, Math.max(6, o.scores.feasibility * 10));
            const bottom = Math.min(92, Math.max(6, o.scores.value * 10));
            return (
              <div
                key={i}
                className="absolute z-10 -translate-x-1/2 translate-y-1/2"
                style={{ left: `${left}%`, bottom: `${bottom}%` }}
                title={`${i + 1}. ${o.category} — ${o.title}`}
                data-testid={`matrix-dot-${i}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-md ring-2 ring-white ${ps.dot}`}
                >
                  {i + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <ol className="space-y-2">
        {opportunities.map((o, i) => {
          const ps = priorityStyle(o.priority);
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${ps.dot}`}>
                {i + 1}
              </span>
              <div>
                <span className="font-semibold text-foreground">{o.category}</span>
                <span className="text-muted-foreground"> — {o.title}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Zet een apiRequest-fout om in een leesbare titel + beschrijving.
// apiRequest gooit "<status>: <body>" waarbij body vaak JSON is met { error, detail }.
function parseApiError(e: any, fallbackTitle: string): { title: string; description: string } {
  const raw = String(e?.message || "");
  const match = raw.match(/^(\d{3}):\s*(.*)$/s);
  if (match) {
    const status = match[1];
    const body = match[2].trim();
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error) {
        return {
          title: parsed.error,
          description: parsed.detail || (status === "429" ? "De limiet is bereikt." : "Probeer het opnieuw."),
        };
      }
    } catch {
      // val terug op de raw body
    }
    return { title: fallbackTitle, description: body || "Probeer het opnieuw." };
  }
  return { title: fallbackTitle, description: raw || "Probeer het opnieuw." };
}

export default function Result() {
  const [, setLocation] = useLocation();
  const { inputs, result, pending, setResult, reset } = useResult();
  const { toast } = useToast();

  // PDF form
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);

  const genMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/generate", inputs);
      return (await res.json()) as KansenkaartResult;
    },
    onSuccess: (data) => setResult(data),
    onError: (e: any) => {
      const { title, description } = parseApiError(e, "Genereren mislukt");
      toast({ title, description, variant: "destructive" });
      // stop de loading-overlay en ga terug naar home als de request geblokkeerd is
      reset();
      setLocation("/");
    },
  });

  // If no inputs at all, go home
  useEffect(() => {
    if (!inputs && !result && !pending) {
      setLocation("/");
    }
  }, [inputs, result, pending, setLocation]);

  // Trigger generation once when pending
  useEffect(() => {
    if (pending && !result && inputs && !genMutation.isPending && !genMutation.isSuccess) {
      genMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, inputs]);

  const leadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/lead", {
        name,
        company,
        email,
        material: inputs?.material,
        organization: inputs?.organization,
        challenge: inputs?.challenge,
        ambition: inputs?.ambition,
        result,
        consent,
      });
      return (await res.json()) as { pdfBase64: string; filename: string };
    },
    onSuccess: (data) => {
      const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0))], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Je PDF wordt gedownload",
        description: "De kansenkaart staat nu in je downloads. Je gegevens hebben we bewaard, dus we kunnen je later nog een keer bereiken als dat handig is.",
      });
    },
    onError: (e: any) => {
      const { title, description } = parseApiError(e, "Er ging iets mis");
      toast({ title, description, variant: "destructive" });
    },
  });

  const showLoading = (pending && !result) || genMutation.isPending;

  useEffect(() => {
    if (!showLoading && result) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [showLoading, result]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {showLoading ? (
        <LoadingState />
      ) : genMutation.isError && !result ? (
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold text-foreground">Genereren mislukt</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            De AI-kansenkaart kon niet worden samengesteld. Probeer het opnieuw.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setLocation("/")}>
              Terug
            </Button>
            <Button onClick={() => genMutation.mutate()} className="bg-highlight text-highlight-foreground hover:bg-highlight">
              Opnieuw proberen
            </Button>
          </div>
        </div>
      ) : result ? (
        <ResultContent
          result={result}
          material={inputs?.material || ""}
          organization={inputs?.organization || ""}
          challenge={inputs?.challenge || ""}
          ambition={inputs?.ambition || ""}
          onBack={() => setLocation("/")}
          name={name}
          company={company}
          email={email}
          setName={setName}
          setCompany={setCompany}
          setEmail={setEmail}
          onSubmitLead={() => leadMutation.mutate()}
          leadPending={leadMutation.isPending}
          consent={consent}
          setConsent={setConsent}
        />
      ) : null}

      <Footer />
    </div>
  );
}

interface ContentProps {
  result: KansenkaartResult;
  material: string;
  organization: string;
  challenge: string;
  ambition: string;
  onBack: () => void;
  name: string;
  company: string;
  email: string;
  setName: (v: string) => void;
  setCompany: (v: string) => void;
  setEmail: (v: string) => void;
  onSubmitLead: () => void;
  leadPending: boolean;
  consent: boolean;
  setConsent: (v: boolean) => void;
}

function ResultContent(p: ContentProps) {
  const { result, material } = p;
  const profile = result.materialProfile;
  const context = [
    p.organization && `Organisatie: ${p.organization}`,
    p.challenge && `Uitdaging: ${p.challenge}`,
    p.ambition && `Ambitie: ${p.ambition}`,
  ].filter(Boolean);

  const emailProvided = p.email.trim().length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email);
  const emailOk = !emailProvided || emailValid;
  const canSubmit = p.name.trim() && p.company.trim() && emailOk && p.consent;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* header */}
      <div className="no-print mb-6 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={p.onBack} data-testid="button-back">
          <ArrowLeft className="mr-1 h-4 w-4" /> Terug
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-sm font-semibold uppercase tracking-wide text-highlight">AI-Kansenkaart</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl" data-testid="text-material-title">
          {material}
        </h1>
        {context.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {context.map((c) => (
              <span key={c} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* A. Materiaalprofiel */}
      <section className="print-break mt-8 rounded-xl border border-card-border bg-card p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Materiaalprofiel</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{profile.description}</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          <ProfileList title="Belangrijke eigenschappen" items={profile.properties} />
          <ProfileList title="Veelvoorkomende klantvragen" items={profile.customerQuestions} icon={<HelpCircle className="h-3.5 w-3.5" />} />
          <ProfileList title="Knelpunten in de keten" items={profile.chainChallenges} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
        </div>
      </section>

      {/* B. Kansen */}
      <section className="mt-10">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-foreground">
          <Sparkles className="h-5 w-5 text-highlight" /> Vijf AI-kansen
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {result.opportunities.map((o, i) => {
            const Icon = iconForCategory(o.category);
            const ps = priorityStyle(o.priority);
            return (
              <motion.article
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: (i % 2) * 0.06 }}
                className="print-break flex flex-col rounded-xl border border-card-border bg-card p-6"
                data-testid={`card-opp-${i}`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{o.category}</p>
                      <h3 className="font-bold leading-tight text-foreground">{o.title}</h3>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ps.badge}`}>
                    {o.priority}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{o.description}</p>

                <dl className="mt-4 space-y-2 text-sm">
                  <Field label="Voorbeeld" value={o.example} />
                  <Field label="Verwachte waarde" value={o.expectedValue} />
                  <Field label="Benodigde data" value={o.requiredData} />
                  <Field label="Eerste test (30 dagen)" value={o.firstTest} />
                </dl>

                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  {SCORE_LABELS.map(([k, label]) => (
                    <ScoreBar key={k} label={label} score={o.scores[k]} />
                  ))}
                </div>

                {o.marketContext && (
                  <div className="mt-5 rounded-lg border border-highlight/30 bg-highlight/[0.06] p-4" data-testid={`market-context-${i}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-highlight">Wat bestaat er al in de markt</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${maturityStyle(o.marketContext.maturity)}`} data-testid={`badge-maturity-${i}`}>
                        {o.marketContext.maturity}
                      </span>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <Field label="Bestaande oplossingen" value={o.marketContext.existingSolutions} />
                      <Field label="Wat nog ontbreekt" value={o.marketContext.gap} />
                    </dl>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* C. Prioriteitenmatrix */}
      <section className="print-break mt-10 rounded-xl border border-card-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Grid2x2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Prioriteitenmatrix</h2>
        </div>
        <PriorityMatrix opportunities={result.opportunities} />
      </section>

      {/* D. PDF export */}
      <section className="no-print mt-10 rounded-xl border border-card-border bg-primary p-6 text-primary-foreground sm:p-8">
        <div className="grid gap-6 md:grid-cols-[1.1fr,1fr] md:items-center">
          <div>
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-highlight/20 text-highlight">
              <FileDown className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold">Download de kansenkaart als PDF</h2>
            <p className="mt-2 text-sm text-primary-foreground/75">
              Vul je gegevens in en download direct een nette PDF met het volledige materiaalprofiel,
              alle vijf de kansen inclusief marktcontext.
            </p>
          </div>
          <div className="space-y-3 rounded-lg bg-primary-foreground/5 p-5">
            <div>
              <Label htmlFor="lead-name" className="text-xs font-medium text-primary-foreground/80">Naam *</Label>
              <Input id="lead-name" value={p.name} onChange={(e) => p.setName(e.target.value)} className="mt-1 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40" placeholder="Je naam" data-testid="input-name" />
            </div>
            <div>
              <Label htmlFor="lead-company" className="text-xs font-medium text-primary-foreground/80">Bedrijf *</Label>
              <Input id="lead-company" value={p.company} onChange={(e) => p.setCompany(e.target.value)} className="mt-1 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40" placeholder="Je bedrijf" data-testid="input-company" />
            </div>
            <div>
              <Label htmlFor="lead-email" className="text-xs font-medium text-primary-foreground/80">E-mail (optioneel)</Label>
              <Input id="lead-email" type="email" value={p.email} onChange={(e) => p.setEmail(e.target.value)} className="mt-1 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40" placeholder="naam@bedrijf.nl" data-testid="input-email" />
            </div>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="lead-consent"
                checked={p.consent}
                onCheckedChange={(v) => p.setConsent(v === true)}
                className="mt-0.5 border-primary-foreground/40 data-[state=checked]:border-highlight data-[state=checked]:bg-highlight data-[state=checked]:text-highlight-foreground"
                data-testid="checkbox-consent"
              />
              <Label htmlFor="lead-consent" className="text-xs leading-relaxed text-primary-foreground/85">
                Ja, ik ga akkoord dat mijn gegevens worden bewaard zodat Merkvast eventueel later contact kan opnemen. Geen marketing, niets gedeeld met derden.
              </Label>
            </div>
            <Button
              onClick={p.onSubmitLead}
              disabled={!canSubmit || p.leadPending}
              className="w-full bg-highlight text-highlight-foreground hover:bg-highlight disabled:opacity-50"
              data-testid="button-submit-lead"
            >
              {p.leadPending ? "Bezig…" : "Download de kansenkaart"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileList({ title, items, icon }: { title: string; items: string[]; icon?: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-primary">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-highlight" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}


