import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname as __esm_dirname } from 'node:path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = __esm_dirname(__filename);

// src/serverless-entry.ts
import express from "express";
import { createServer } from "node:http";

// shared/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name"),
  company: text("company"),
  email: text("email"),
  material: text("material").notNull(),
  organization: text("organization"),
  challenge: text("challenge"),
  ambition: text("ambition"),
  resultJson: text("resultJson"),
  consent: integer("consent").default(0),
  consentAt: text("consentAt"),
  createdAt: text("createdAt").default(sql`(datetime('now'))`)
});
var materialQueries = sqliteTable("material_queries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  material: text("material").notNull(),
  organization: text("organization"),
  challenge: text("challenge"),
  ambition: text("ambition"),
  createdAt: text("createdAt").default(sql`(datetime('now'))`)
});
var alertState = sqliteTable("alert_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(),
  kind: text("kind").notNull(),
  level: text("level").notNull(),
  sentAt: text("sentAt").default(sql`(datetime('now'))`)
});
var insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true
});
var insertMaterialQuerySchema = createInsertSchema(materialQueries).omit({
  id: true,
  createdAt: true
});

// server/storage.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { desc, sql as sql2, and, eq } from "drizzle-orm";
var _client = null;
var _db = null;
function getClient() {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error(
      `TURSO_DATABASE_URL ontbreekt in de runtime. process.env keys: ${Object.keys(process.env).filter((k) => !k.startsWith("AWS_") && !k.startsWith("LAMBDA_")).slice(0, 30).join(", ")}`
    );
  }
  _client = createClient({ url, authToken: token });
  return _client;
}
var client = new Proxy({}, {
  get(_target, prop) {
    return getClient()[prop];
  }
});
var db = new Proxy({}, {
  get(_target, prop) {
    if (!_db) _db = drizzle(getClient());
    return _db[prop];
  }
});
var schemaReady = null;
async function ensureSchema() {
  if (schemaReady) return schemaReady;
  const c = getClient();
  schemaReady = (async () => {
    await c.batch([
      "CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, company TEXT, email TEXT, material TEXT NOT NULL, organization TEXT, challenge TEXT, ambition TEXT, resultJson TEXT, consent INTEGER DEFAULT 0, consentAt TEXT, createdAt TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS material_queries (id INTEGER PRIMARY KEY AUTOINCREMENT, material TEXT NOT NULL, organization TEXT, challenge TEXT, ambition TEXT, createdAt TEXT DEFAULT (datetime('now')))",
      "CREATE TABLE IF NOT EXISTS alert_state (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, kind TEXT NOT NULL, level TEXT NOT NULL, sentAt TEXT DEFAULT (datetime('now')))",
      "CREATE INDEX IF NOT EXISTS idx_material_queries_created ON material_queries(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(createdAt)",
      "CREATE INDEX IF NOT EXISTS idx_leads_email_created ON leads(email, createdAt)"
    ], "write");
    for (const stmt of [
      "ALTER TABLE leads ADD COLUMN consent INTEGER DEFAULT 0",
      "ALTER TABLE leads ADD COLUMN consentAt TEXT"
    ]) {
      try {
        await client.execute(stmt);
      } catch {
      }
    }
  })();
  return schemaReady;
}
function todayUtcDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
var DatabaseStorage = class {
  async createLead(lead) {
    await ensureSchema();
    const rows = await db.insert(leads).values(lead).returning();
    return rows[0];
  }
  async listLeads() {
    await ensureSchema();
    return db.select().from(leads).orderBy(desc(leads.id));
  }
  async createQuery(q) {
    await ensureSchema();
    const rows = await db.insert(materialQueries).values(q).returning();
    return rows[0];
  }
  async countGenerationsToday() {
    await ensureSchema();
    const rows = await db.select({ n: sql2`count(*)` }).from(materialQueries).where(sql2`date(${materialQueries.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }
  async countPdfsToday() {
    await ensureSchema();
    const rows = await db.select({ n: sql2`count(*)` }).from(leads).where(sql2`date(${leads.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }
  async countPdfsTodayForEmail(email) {
    await ensureSchema();
    const rows = await db.select({ n: sql2`count(*)` }).from(leads).where(sql2`lower(${leads.email}) = ${email.toLowerCase()} AND date(${leads.createdAt}) = ${todayUtcDate()}`);
    return Number(rows[0]?.n ?? 0);
  }
  async wasAlertSent(day, kind, scope, level) {
    await ensureSchema();
    const key = `${kind}:${scope}:${level}`;
    const rows = await db.select({ id: alertState.id }).from(alertState).where(and(eq(alertState.day, day), eq(alertState.kind, kind), eq(alertState.level, key)));
    return rows.length > 0;
  }
  async markAlertSent(day, kind, scope, level) {
    await ensureSchema();
    const key = `${kind}:${scope}:${level}`;
    await db.insert(alertState).values({ day, kind, level: key });
  }
};
var LIMITS = {
  GENERATE_TOTAL: 200,
  PDF_TOTAL: 200,
  PDF_PER_EMAIL: 3,
  ALERT_THRESHOLD: 0.8
};
var storage = new DatabaseStorage();

// server/routes.ts
import Anthropic from "@anthropic-ai/sdk";
import PDFDocument from "pdfkit";
import { z } from "zod";
var anthropic = new Anthropic();
async function maybeAlert(_kind, _scope, _current, _limit, _email) {
  return;
}
var generateSchema = z.object({
  material: z.string().min(1),
  organization: z.string().optional().default(""),
  challenge: z.string().optional().default(""),
  ambition: z.string().optional().default("")
});
function buildPrompt(material, organization, challenge, ambition) {
  return `Strategisch AI-adviseur voor bouwmaterialenketen. Analyseer: ${material}.
Context: ${organization || "?"} | ${challenge || "?"} | ${ambition || "?"}

Retourneer UITSLUITEND JSON in deze structuur:
{
  "materialProfile": { "description": "korte omschrijving", "properties": ["a","b","c","d"], "customerQuestions": ["a","b","c"], "chainChallenges": ["a","b","c"] },
  "opportunities": [ { "category": "...", "title": "...", "description": "korte uitleg", "example": "voorbeeld", "expectedValue": "waarde", "requiredData": "data", "firstTest": "test 30 dagen", "scores": { "value": 8, "feasibility": 7, "dataNeed": 6, "wow": 5 }, "priority": "Quick win", "marketContext": { "maturity": "Bestaat generiek", "existingSolutions": "2-3 concrete tools/bedrijven", "gap": "wat mist nog" } } ]
}

Regels:
- Exact 5 kansen, 1 per categorie in volgorde: "Artikeldata", "Klantadvies", "Logistiek & voorraad", "Duurzaamheid & circulariteit", "Commerci\xEBle waarde"
- priority: exact \xE9\xE9n van "Quick win", "Strategische kans", "Later onderzoeken", "Niet direct relevant"
- scores: integers 1-10
- maturity: exact \xE9\xE9n van "Nog niet", "In opkomst", "Bestaat generiek", "Volwassen markt"
- existingSolutions: noem 2-3 concrete tools/platforms/bedrijven (bijv. nesting-software, restpartij-marktplaatsen); zeg expliciet als niks bestaat
- gap: 1-2 zinnen wat mist voor DIT materiaal/keten/organisatie
- description en example: max 25 woorden
- Zakelijk, concreet, bouwspecifiek, Nederlands
- Alleen Latijnse tekens`;
}
function drawSectionTitle(doc, text2) {
  doc.moveDown(0.6);
  doc.fillColor("#0a2d5e").fontSize(14).font("Helvetica-Bold").text(text2);
  doc.moveTo(doc.x, doc.y + 2).lineTo(555, doc.y + 2).strokeColor("#e78a3c").lineWidth(2).stroke();
  doc.moveDown(0.4);
  doc.fillColor("#1a1a1a").font("Helvetica").fontSize(10);
}
function generatePdf(payload) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      const { material, organization, challenge, ambition, result } = payload;
      doc.rect(0, 0, 595, 70).fill("#0a2d5e");
      doc.fillColor("#e78a3c").rect(40, 26, 18, 18).fill();
      doc.fillColor("#4aa3e0").rect(48, 34, 18, 18).fillOpacity(0.9).fill().fillOpacity(1);
      doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text("Bouwmateriaal AI Lab", 78, 26);
      doc.fillColor("#a9c6e8").fontSize(9).font("Helvetica").text("AI-Kansenkaart", 78, 48);
      doc.moveDown(2);
      doc.y = 90;
      doc.fillColor("#0a2d5e").fontSize(20).font("Helvetica-Bold").text(`AI-Kansenkaart voor ${material}`);
      doc.moveDown(0.3);
      doc.fillColor("#555555").fontSize(10).font("Helvetica").text(
        [organization && `Organisatie: ${organization}`, challenge && `Uitdaging: ${challenge}`, ambition && `Ambitie: ${ambition}`].filter(Boolean).join("   \u2022   ")
      );
      const p = result?.materialProfile;
      if (p) {
        drawSectionTitle(doc, "Materiaalprofiel");
        doc.text(p.description);
        doc.moveDown(0.3);
        doc.font("Helvetica-Bold").text("Belangrijke eigenschappen:");
        doc.font("Helvetica").list(p.properties || [], { bulletRadius: 1.5 });
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").text("Veelvoorkomende klantvragen:");
        doc.font("Helvetica").list(p.customerQuestions || [], { bulletRadius: 1.5 });
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").text("Knelpunten in de keten:");
        doc.font("Helvetica").list(p.chainChallenges || [], { bulletRadius: 1.5 });
      }
      const opps = result?.opportunities || [];
      drawSectionTitle(doc, "Vijf AI-kansen");
      opps.forEach((o, i) => {
        if (doc.y > 720) doc.addPage();
        doc.font("Helvetica-Bold").fillColor("#0a2d5e").fontSize(11).text(`${i + 1}. ${o.category} \u2014 ${o.title}`);
        doc.font("Helvetica").fillColor("#1a1a1a").fontSize(9.5);
        doc.text(o.description);
        doc.fillColor("#555").text(`Voorbeeld: ${o.example}`);
        doc.text(`Verwachte waarde: ${o.expectedValue}`);
        doc.text(`Benodigde data: ${o.requiredData}`);
        doc.text(`Eerste test (30 dagen): ${o.firstTest}`);
        if (o.scores) {
          doc.fillColor("#0a2d5e").text(
            `Scores \u2014 Waarde ${o.scores.value}/10 \xB7 Haalbaarheid ${o.scores.feasibility}/10 \xB7 Databehoefte ${o.scores.dataNeed}/10 \xB7 Wow ${o.scores.wow}/10   [${o.priority}]`
          );
        }
        if (o.marketContext) {
          doc.moveDown(0.3);
          doc.font("Helvetica-Bold").fillColor("#e78a3c").fontSize(9).text(`Wat bestaat er al in de markt \u2014 ${o.marketContext.maturity}`);
          doc.font("Helvetica").fillColor("#1a1a1a").fontSize(9.5);
          if (o.marketContext.existingSolutions) doc.text(`Bestaande oplossingen: ${o.marketContext.existingSolutions}`);
          if (o.marketContext.gap) doc.text(`Wat nog ontbreekt: ${o.marketContext.gap}`);
        }
        doc.fillColor("#1a1a1a").moveDown(0.5);
      });
      doc.moveDown(1.5);
      doc.fontSize(8).fillColor("#888").text("\xA9 2026 Bouwmateriaal AI Lab \xB7 Gemaakt door Merkvast \xB7 Deze kaart is een startmotor voor innovatiegesprekken, geen eindantwoord.", { align: "center" });
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
async function registerRoutes(httpServer, app2) {
  app2.post("/api/generate", async (req, res) => {
    try {
      const parsed = generateSchema.parse(req.body);
      const currentGen = await storage.countGenerationsToday();
      if (currentGen >= LIMITS.GENERATE_TOTAL) {
        void maybeAlert("generate", "total", currentGen, LIMITS.GENERATE_TOTAL);
        return res.status(429).json({
          error: "Dagelijkse limiet bereikt",
          detail: `We hebben vandaag het maximum aantal kansenkaarten al gegenereerd (${LIMITS.GENERATE_TOTAL}). Probeer het morgen opnieuw of neem contact op met Merkvast.`
        });
      }
      const prompt = buildPrompt(parsed.material, parsed.organization, parsed.challenge, parsed.ambition);
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }]
      });
      const text2 = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonText = text2.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
      let result;
      try {
        result = JSON.parse(jsonText);
      } catch {
        const m = jsonText.match(/\{[\s\S]*\}/) || [jsonText];
        let candidate = m[0];
        candidate = candidate.replace(/,\s*(\]|\})/g, "$1");
        try {
          result = JSON.parse(candidate);
        } catch {
          const opens = (candidate.match(/\{/g) || []).length;
          const closes = (candidate.match(/\}/g) || []).length;
          const bopens = (candidate.match(/\[/g) || []).length;
          const bcloses = (candidate.match(/\]/g) || []).length;
          candidate = candidate + "]".repeat(Math.max(0, bopens - bcloses)) + "}".repeat(Math.max(0, opens - closes));
          candidate = candidate.replace(/,\s*(\]|\})/g, "$1");
          try {
            result = JSON.parse(candidate);
          } catch (e) {
            console.error("JSON parse failed. Raw length:", jsonText.length, "tail:", jsonText.slice(-400));
            throw new Error("Kon geen geldige JSON uit het AI-antwoord halen.");
          }
        }
      }
      await storage.createQuery({
        material: parsed.material,
        organization: parsed.organization || null,
        challenge: parsed.challenge || null,
        ambition: parsed.ambition || null
      });
      void maybeAlert("generate", "total", currentGen + 1, LIMITS.GENERATE_TOTAL);
      res.json(result);
    } catch (err) {
      console.error("generate error", err);
      res.status(500).json({ error: err?.message || "Er ging iets mis bij het genereren." });
    }
  });
  app2.post("/api/lead", async (req, res) => {
    try {
      const body = req.body || {};
      const email = String(body.email || "").trim().toLowerCase();
      if (email) {
        const perEmail = await storage.countPdfsTodayForEmail(email);
        if (perEmail >= LIMITS.PDF_PER_EMAIL) {
          void maybeAlert("pdf", "email", perEmail, LIMITS.PDF_PER_EMAIL, email);
          return res.status(429).json({
            error: "Limiet per e-mailadres bereikt",
            detail: `Je hebt vandaag al ${LIMITS.PDF_PER_EMAIL} PDF-kansenkaarten aangevraagd op dit e-mailadres. Probeer het morgen opnieuw.`
          });
        }
      }
      if (!body.consent) {
        return res.status(400).json({
          error: "Toestemming ontbreekt",
          detail: "Bevestig de toestemmingsvinkje om je PDF-kansenkaart te ontvangen."
        });
      }
      const totalPdfs = await storage.countPdfsToday();
      if (totalPdfs >= LIMITS.PDF_TOTAL) {
        void maybeAlert("pdf", "total", totalPdfs, LIMITS.PDF_TOTAL);
        return res.status(429).json({
          error: "Dagelijkse PDF-limiet bereikt",
          detail: `We hebben vandaag het maximum aantal PDF-kansenkaarten al verstuurd (${LIMITS.PDF_TOTAL}). Probeer het morgen opnieuw.`
        });
      }
      const leadInput = insertLeadSchema.parse({
        name: body.name || null,
        company: body.company || null,
        email: body.email && String(body.email).trim() ? String(body.email).trim() : null,
        material: body.material,
        organization: body.organization || null,
        challenge: body.challenge || null,
        ambition: body.ambition || null,
        resultJson: body.result ? JSON.stringify(body.result) : null,
        consent: body.consent ? 1 : 0,
        consentAt: body.consent ? (/* @__PURE__ */ new Date()).toISOString() : null
      });
      await storage.createLead(leadInput);
      const pdfBuffer = await generatePdf({
        material: body.material,
        organization: body.organization,
        challenge: body.challenge,
        ambition: body.ambition,
        result: body.result
      });
      const safeName = String(body.material || "materiaal").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filename = `ai-kansenkaart-${safeName || "bouwmateriaal"}.pdf`;
      if (email) {
        void maybeAlert("pdf", "email", await storage.countPdfsTodayForEmail(email), LIMITS.PDF_PER_EMAIL, email);
      }
      void maybeAlert("pdf", "total", totalPdfs + 1, LIMITS.PDF_TOTAL);
      res.json({
        pdfBase64: pdfBuffer.toString("base64"),
        filename
      });
    } catch (err) {
      console.error("lead error", err);
      res.status(500).json({ error: err?.message || "Er ging iets mis bij het opslaan." });
    }
  });
  app2.get("/api/leads", async (req, res) => {
    const providedToken = req.headers["x-admin-token"] ?? req.query.token;
    const expectedToken = process.env.ADMIN_TOKEN;
    if (!expectedToken || providedToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const rows = await storage.listLeads();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  return httpServer;
}

// src/serverless-entry.ts
var app = express();
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
var routesReady = null;
async function ensureRoutes() {
  if (!routesReady) {
    const httpServer = createServer(app);
    routesReady = registerRoutes(httpServer, app).then(() => {
      app.use((err, _req, res, next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Route error:", err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    });
  }
  return routesReady;
}
async function handler(req, res) {
  try {
    await ensureRoutes();
    return app(req, res);
  } catch (err) {
    console.error("Startup crash:", err);
    return res.status(500).json({
      error: "startup_failed",
      message: err?.message || String(err),
      stack: err?.stack || null
    });
  }
}
export {
  handler as default
};
