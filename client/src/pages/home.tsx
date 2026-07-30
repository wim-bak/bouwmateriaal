import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Building2,
  Package,
  Sparkles,
  ArrowRight,
  Target,
  FileSearch,
  Layers,
} from "lucide-react";
import { Navbar, Footer } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useResult } from "@/lib/result-context";
import { examples } from "@/data/examples";
import { iconForCategory, priorityStyle } from "@/lib/opp-meta";

const MATERIAL_CHIPS = [
  "isolatie",
  "kalkzandsteen",
  "betonplaat",
  "hout",
  "dakpan",
  "gevelbekleding",
  "bevestigingsmateriaal",
];

const ORGANIZATIONS = ["Bouwgroothandel", "Fabrikant", "Toeleverancier", "Aannemer", "Ontwikkelaar"];
const CHALLENGES = [
  "Meer marge",
  "Minder verspilling",
  "Duurzamer advies",
  "Betere artikeldata",
  "Slimmere logistiek",
  "Betere klantkeuze",
  "Nieuwe toepassing",
];
const AMBITIONS = ["Quick win", "Strategische kans", "Moonshot"];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { startGeneration, setPreset } = useResult();

  const [material, setMaterial] = useState("");
  const [organization, setOrganization] = useState("");
  const [challenge, setChallenge] = useState("");
  const [ambition, setAmbition] = useState("Strategische kans");
  const [error, setError] = useState("");

  const handleGenerate = () => {
    if (!material.trim()) {
      setError("Vul eerst een bouwmateriaal in.");
      scrollTo("verkenner");
      return;
    }
    setError("");
    startGeneration({ material: material.trim(), organization, challenge, ambition });
    setLocation("/resultaat");
    setTimeout(() => window.scrollTo(0, 0), 30);
  };

  const openExample = (key: string) => {
    const ex = examples.find((e) => e.key === key);
    if (!ex) return;
    setPreset(ex.inputs, ex.result);
    setLocation("/resultaat");
    setTimeout(() => window.scrollTo(0, 0), 30);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onNav={scrollTo} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-highlight/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-lichtblauw/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-highlight" />
              AI-kansen voor de bouwmaterialenketen
            </span>
            <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
              Ontdek wat AI kan betekenen voor jouw bouwmateriaal
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Voer een bouwmateriaal in, zoals isolatie, beton, hout of gevelbekleding. De tool
              laat direct zien waar en hoe AI waarde kan toevoegen: in artikeldata, klantadvies,
              logistiek, duurzaamheid en commerciële kansen.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/70 md:text-base">
              Je ontvangt een praktische AI-kansenkaart die je kunt gebruiken in een MT,
              innovatiesessie of commercieel overleg.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => scrollTo("verkenner")}
                size="lg"
                className="bg-highlight text-highlight-foreground hover:bg-highlight"
                data-testid="button-hero-cta"
              >
                Start de materiaalverkenning
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                onClick={() => scrollTo("voorbeelden")}
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                data-testid="button-hero-examples"
              >
                Bekijk voorbeelden
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 STAPPEN */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            In drie stappen naar een AI-kansenkaart
          </h2>
          <p className="mt-2 text-muted-foreground">
            Geen technisch project, maar een startmotor voor het gesprek over waar AI waarde
            toevoegt.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Package,
              title: "Voer een bouwmateriaal in",
              desc: "Typ het materiaal waar je mee werkt — van spouwisolatie tot bevestigingsmateriaal.",
            },
            {
              icon: Target,
              title: "Kies je uitdaging",
              desc: "Meer marge, minder verspilling, duurzamer advies of slimmere logistiek.",
            },
            {
              icon: FileSearch,
              title: "Ontvang een AI-kansenkaart",
              desc: "Vijf concrete kansen met scores, marktcontext en prioriteitenmatrix.",
            },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-xl border border-card-border bg-card p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-2xl font-extrabold text-highlight">{i + 1}</span>
              </div>
              <h3 className="mb-1.5 font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* VERKENNER */}
      <section id="verkenner" className="scroll-mt-20 border-y border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Materiaalverkenner
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Voer een bouwmateriaal in en geef je context. Wij stellen de AI-kansenkaart samen.
            </p>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-6 shadow-sm sm:p-8">
            <div className="space-y-6">
              <div>
                <Label htmlFor="material" className="text-sm font-semibold">
                  Bouwmateriaal <span className="text-highlight">*</span>
                </Label>
                <Input
                  id="material"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Bijv. spouwisolatie, kalkzandsteen, houten gevelbekleding…"
                  className="mt-2"
                  data-testid="input-material"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {MATERIAL_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setMaterial(chip)}
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover-elevate"
                      data-testid={`chip-${chip}`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-semibold">Type organisatie</Label>
                  <Select value={organization} onValueChange={setOrganization}>
                    <SelectTrigger className="mt-2" data-testid="select-organization">
                      <SelectValue placeholder="Kies organisatie" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Belangrijkste uitdaging</Label>
                  <Select value={challenge} onValueChange={setChallenge}>
                    <SelectTrigger className="mt-2" data-testid="select-challenge">
                      <SelectValue placeholder="Kies uitdaging" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Ambitieniveau</Label>
                <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background p-1">
                  {AMBITIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmbition(a)}
                      className={`rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                        ambition === a
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover-elevate"
                      }`}
                      data-testid={`ambition-${a}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium text-destructive" data-testid="text-error">
                  {error}
                </p>
              )}

              <Button
                onClick={handleGenerate}
                size="lg"
                className="w-full bg-highlight text-highlight-foreground hover:bg-highlight"
                data-testid="button-generate"
              >
                <Sparkles className="mr-1 h-4 w-4" />
                Genereer AI-Kansenkaart
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* VOORBEELDEN */}
      <section id="voorbeelden" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Voorbeeldkaarten
            </h2>
            <p className="mt-2 text-muted-foreground">
              Bekijk drie uitgewerkte AI-kansenkaarten om te zien wat de tool oplevert.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {examples.map((ex, i) => {
              const top = ex.result.opportunities.reduce((a, b) =>
                a.scores.value + a.scores.feasibility >= b.scores.value + b.scores.feasibility ? a : b
              );
              const Icon = iconForCategory(top.category);
              const ps = priorityStyle(top.priority);
              return (
                <motion.button
                  key={ex.key}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  onClick={() => openExample(ex.key)}
                  className="group flex flex-col rounded-xl border border-card-border bg-card p-6 text-left hover-elevate"
                  data-testid={`card-example-${ex.key}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ps.badge}`}>
                      {top.priority}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{ex.label}</h3>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {ex.subtitle}
                  </p>
                  <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {ex.result.materialProfile.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-highlight">
                    <Icon className="h-4 w-4" />
                    Bekijk kansenkaart
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* OVER */}
      <section id="over" className="scroll-mt-20 border-t border-border bg-muted/40">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <div className="rounded-2xl border border-card-border bg-card p-8 md:p-10">
            <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-highlight/15 text-highlight">
              <Layers className="h-5 w-5" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Over de tool
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-foreground">
              Deze tool is geen eindantwoord, maar een startmotor voor innovatiegesprekken. De
              uitkomsten helpen managementteams om sneller te bepalen waar AI waarde kan toevoegen.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                ["In het MT", "Bepaal snel welke AI-kansen prioriteit verdienen en waar je eerst wilt experimenteren."],
                ["In een innovatiesessie", "Gebruik de kansenkaart als startpunt om ideeën scherp te maken en te ordenen."],
                ["In commercieel overleg", "Vertaal materiaalkennis naar concrete proposities voor klanten en de keten."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg border border-border bg-background p-4">
                  <h3 className="mb-1 text-sm font-semibold text-primary">{t}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
