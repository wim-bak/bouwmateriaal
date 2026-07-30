import { useLocation } from "wouter";
import { Logo } from "./logo";

export function Navbar({ onNav }: { onNav?: (id: string) => void }) {
  const [, setLocation] = useLocation();

  const go = (id: string) => {
    if (onNav) {
      onNav(id);
    } else {
      setLocation("/");
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          onClick={() => { setLocation("/"); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40); }}
          className="flex items-center gap-2.5 text-primary"
          data-testid="link-home"
        >
          <Logo className="h-8 w-8" />
          <span className="text-[15px] font-bold tracking-tight text-foreground">Bouwmateriaal AI Lab</span>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            ["verkenner", "Verkenner"],
            ["voorbeelden", "Voorbeelden"],
            ["over", "Over de tool"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => go(id)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover-elevate"
              data-testid={`nav-${id}`}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => go("verkenner")}
            className="ml-2 rounded-md bg-highlight px-4 py-2 text-sm font-semibold text-highlight-foreground hover-elevate active-elevate-2"
            data-testid="nav-cta"
          >
            Start verkenning
          </button>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="no-print border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold">Bouwmateriaal AI Lab</span>
        </div>
        <p className="text-primary-foreground/70">© 2026 Bouwmateriaal AI Lab · Gemaakt door Merkvast</p>
      </div>
    </footer>
  );
}
