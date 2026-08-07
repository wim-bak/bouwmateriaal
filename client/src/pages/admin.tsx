import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Lead {
  id: number;
  name: string | null;
  company: string | null;
  email: string | null;
  material: string;
  organization: string | null;
  challenge: string | null;
  ambition: string | null;
  resultJson: string | null;
  consent: number | null;
  consentAt: string | null;
  createdAt: string;
}

// LocalStorage is geblokkeerd in de iframe-preview; we bewaren het token daarom in-memory.
// Bij herladen moet de gebruiker het opnieuw invoeren, dat is prima voor admin.
let cachedToken = "";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    return d.toLocaleString("nl-NL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function csvEscape(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(leads: Lead[]) {
  const headers = [
    "id",
    "datum",
    "naam",
    "bedrijf",
    "email",
    "materiaal",
    "organisatie",
    "uitdaging",
    "ambitie",
    "toestemming",
  ];
  const rows = leads.map((l) =>
    [
      l.id,
      l.createdAt,
      l.name,
      l.company,
      l.email,
      l.material,
      l.organization,
      l.challenge,
      l.ambition,
      l.consent ? "ja" : "nee",
    ]
      .map(csvEscape)
      .join(";"),
  );
  const csv = [headers.join(";"), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [token, setToken] = useState(cachedToken);
  const [authed, setAuthed] = useState(!!cachedToken);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);

  const load = async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/leads", { headers: { "x-admin-token": t } });
      if (r.status === 401) {
        setError("Onjuist token.");
        setAuthed(false);
        return;
      }
      if (!r.ok) {
        setError(`Fout ${r.status}`);
        return;
      }
      const data = (await r.json()) as Lead[];
      setLeads(data);
      cachedToken = t;
      setAuthed(true);
    } catch (e: any) {
      setError(e?.message || "Netwerkfout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cachedToken) load(cachedToken);
  }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    if (!f) return leads;
    return leads.filter((l) =>
      [l.name, l.company, l.email, l.material, l.organization, l.challenge]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(f)),
    );
  }, [leads, filter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day7 = now - 7 * 24 * 3600 * 1000;
    const withEmail = leads.filter((l) => l.email && l.email.trim()).length;
    const withCompany = leads.filter((l) => l.company && l.company.trim()).length;
    const last7 = leads.filter((l) => {
      const d = new Date((l.createdAt || "").replace(" ", "T") + "Z").getTime();
      return d >= day7;
    }).length;
    const materials = new Map<string, number>();
    for (const l of leads) {
      const key = (l.material || "").toLowerCase().trim();
      if (!key) continue;
      materials.set(key, (materials.get(key) || 0) + 1);
    }
    const topMaterials = [...materials.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      total: leads.length,
      withEmail,
      withCompany,
      last7,
      topMaterials,
    };
  }, [leads]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin toegang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="token">Admin token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && token) load(token);
                }}
                placeholder="Plak je admin token"
                data-testid="input-admin-token"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              onClick={() => load(token)}
              disabled={!token || loading}
              className="w-full"
              data-testid="button-admin-login"
            >
              {loading ? "Bezig..." : "Inloggen"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold">Leads dashboard</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => load(cachedToken)}
              disabled={loading}
              data-testid="button-refresh"
            >
              {loading ? "Laden..." : "Ververs"}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadCsv(leads)}
              disabled={!leads.length}
              data-testid="button-export-csv"
            >
              Exporteer CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                cachedToken = "";
                setAuthed(false);
                setToken("");
                setLeads([]);
              }}
              data-testid="button-logout"
            >
              Uitloggen
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Totaal leads" value={stats.total} />
          <StatCard label="Laatste 7 dagen" value={stats.last7} />
          <StatCard label="Met e-mail" value={stats.withEmail} sub={leads.length ? `${Math.round((stats.withEmail / leads.length) * 100)}%` : ""} />
          <StatCard label="Met bedrijf" value={stats.withCompany} sub={leads.length ? `${Math.round((stats.withCompany / leads.length) * 100)}%` : ""} />
        </div>

        {stats.topMaterials.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Top materialen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.topMaterials.map(([mat, count]) => (
                <div key={mat} className="flex items-center gap-3">
                  <div className="w-32 truncate text-sm">{mat}</div>
                  <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(count / stats.topMaterials[0][1]) * 100}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm text-muted-foreground">{count}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div>
          <Input
            placeholder="Zoek op naam, bedrijf, e-mail, materiaal..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Naam</TableHead>
                    <TableHead>Bedrijf</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Materiaal</TableHead>
                    <TableHead>Uitdaging</TableHead>
                    <TableHead>Toestemming</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {leads.length === 0 ? "Nog geen leads" : "Geen resultaten voor filter"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((l) => (
                      <TableRow
                        key={l.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelected(l)}
                        data-testid={`row-lead-${l.id}`}
                      >
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(l.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{l.name || "-"}</TableCell>
                        <TableCell>{l.company || "-"}</TableCell>
                        <TableCell className="text-sm">
                          {l.email ? (
                            <a
                              href={`mailto:${l.email}`}
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {l.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.material}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {l.challenge || "-"}
                        </TableCell>
                        <TableCell>
                          {l.consent ? (
                            <Badge variant="default">Ja</Badge>
                          ) : (
                            <Badge variant="secondary">Nee</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.name || "Anonieme lead"}
                  {selected.company && (
                    <span className="text-muted-foreground font-normal"> · {selected.company}</span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <Row label="Datum">{formatDate(selected.createdAt)}</Row>
                <Row label="E-mail">
                  {selected.email ? (
                    <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                      {selected.email}
                    </a>
                  ) : (
                    "-"
                  )}
                </Row>
                <Row label="Materiaal">{selected.material}</Row>
                <Row label="Organisatie">{selected.organization || "-"}</Row>
                <Row label="Uitdaging">{selected.challenge || "-"}</Row>
                <Row label="Ambitie">{selected.ambition || "-"}</Row>
                <Row label="Toestemming">
                  {selected.consent ? "Ja" : "Nee"}
                  {selected.consentAt ? ` · ${formatDate(selected.consentAt)}` : ""}
                </Row>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 items-start">
      <div className="text-muted-foreground text-xs uppercase tracking-wide pt-0.5">{label}</div>
      <div>{children}</div>
    </div>
  );
}
