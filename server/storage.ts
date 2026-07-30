import { leads, materialQueries, alertState } from '@shared/schema';
import type { Lead, InsertLead, MaterialQuery, InsertMaterialQuery } from '@shared/schema';
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { desc, sql, and, eq } from "drizzle-orm";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  throw new Error("TURSO_DATABASE_URL is niet gezet. Voeg 'm toe aan je environment variables.");
}

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

export const db = drizzle(client);

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await client.batch([
      "CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, company TEXT, email TEXT, material TEXT NOT NULL, organization TEXT, challenge TEXT, ambition TEXT, resultJson TEXT, consent INTEGER DEFAULT 0, consentAt TEXT, createdAt TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS material_queries (id INTEGER PRIMARY KEY AUTOINCREMENT, material TEXT NOT NULL, organization TEXT, challenge TEXT, ambition TEXT, createdAt TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS alert_state (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL, level TEXT NOT NULL, sentAt TEXT DEFAULT (datetime('now')))",
      "CREATE INDEX IF NOT EXISTS idx_material_queries_created ON material_queries(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_leads_email_created ON leads(email, createdAt)",
    ], "write");
    // Best-effort migraties voor bestaande tabellen
    for (const stmt of [
      "ALTER TABLE leads ADD COLUMN consent INTEGER DEFAULT 0",
      "ALTER TABLE leads ADD COLUMN consentAt TEXT",
    ]) {
      try { await client.execute(stmt); } catch { /* kolom bestaat al */ }
    }
  })();
  return schemaReady;
}

// Warm-up: schema aanmaken bij eerste import (in serverless: bij eerste request)
ensureSchema().catch((err) => console.error("Schema init faalde:", err));

export type LimitKind = "generate" | "pdf";
export type LimitScope = "total" | "email";

export interface IStorage {
  createLead(lead: InsertLead): Promise<Lead>;
  listLeads(): Promise<Lead[]>;
  createQuery(q: InsertMaterialQuery): Promise<MaterialQuery>;
  countGenerationsToday(): Promise<number>;
  countPdfsToday(): Promise<number>;
  countPdfsTodayForEmail(email: string): Promise<number>;
  wasAlertSent(day: string, kind: LimitKind, scope: LimitScope, level: string): Promise<boolean>;
  markAlertSent(day: string, kind: LimitKind, scope: LimitScope, level: string): Promise<void>;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export class DatabaseStorage implements IStorage {
  async createLead(lead: InsertLead): Promise<Lead> {
    await ensureSchema();
    const rows = await db.insert(leads).values(lead).returning();
    return rows[0];
  }

  async listLeads(): Promise<Lead[]> {
    await ensureSchema();
    return db.select().from(leads).orderBy(desc(leads.id));
  }

  async createQuery(q: InsertMaterialQuery): Promise<MaterialQuery> {
    await ensureSchema();
    const rows = await db.insert(materialQueries).values(q).returning();
    return rows[0];
  }

  async countGenerationsToday(): Promise<number> {
    await ensureSchema();
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(materialQueries)
      .where(sql`date(${materialQueries.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }

  async countPdfsToday(): Promise<number> {
    await ensureSchema();
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(leads)
      .where(sql`date(${leads.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }

  async countPdfsTodayForEmail(email: string): Promise<number> {
    await ensureSchema();
    const rows = await db
      .select({ n: sql<number>`count(*)` })
      .from(leads)
      .where(sql`lower(${leads.email}) = ${email.toLowerCase()} AND date(${leads.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }

  async wasAlertSent(day: string, kind: LimitKind, scope: LimitScope, level: string): Promise<boolean> {
    await ensureSchema();
    const key = `${kind}:${scope}:${level}`;
    const rows = await db
      .select({ id: alertState.id })
      .from(alertState)
      .where(and(eq(alertState.day, day), eq(alertState.kind, kind), eq(alertState.level, key)));
    return rows.length > 0;
  }

  async markAlertSent(day: string, kind: LimitKind, scope: LimitScope, level: string): Promise<void> {
    await ensureSchema();
    const key = `${kind}:${scope}:${level}`;
    await db.insert(alertState).values({ day, kind, level: key });
  }
}

export const LIMITS = {
  GENERATE_TOTAL: 200,
  PDF_TOTAL: 200,
  PDF_PER_EMAIL: 3,
  ALERT_THRESHOLD: 0.8,
} as const;

export function todayKey(): string {
  return todayUtcDate();
}

export const storage = new DatabaseStorage();
