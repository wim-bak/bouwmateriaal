import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage, LIMITS, todayKey } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import PDFDocument from "pdfkit";
import { z } from "zod";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL from env

// Email-verzending is verwijderd. De AI-Kansenkaart wordt uitsluitend als download
// aangeboden aan de gebruiker. Limit-tracking blijft actief (via /admin te bekijken),
// maar er worden geen alert-mails meer verstuurd.

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// No-op: alerts worden niet meer per mail verstuurd. Server-side tracking blijft actief
// zodat je limieten kan monitoren via /admin.
async function maybeAlert(
  _kind: "generate" | "pdf",
  _scope: "total" | "email",
  _current: number,
  _limit: number,
  _email?: string,
): Promise<void> {
  return;
}

const generateSchema = z.object({
  material: z.string().min(1),
  organization: z.string().optional().default(""),
  challenge: z.string().optional().default(""),
  ambition: z.string().optional().default(""),
});

function buildPrompt(material: string, organization: string, challenge: string, ambition: string) {
  return `Strategisch AI-adviseur voor bouwmaterialenketen. Analyseer: ${material}.
Context: ${organization || "?"} | ${challenge || "?"} | ${ambition || "?"}

Retourneer UITSLUITEND JSON in deze structuur:
{
  "materialProfile": { "description": "korte omschrijving", "properties": ["a","b","c","d"], "customerQuestions": ["a","b","c"], "chainChallenges": ["a","b","c"] },
  "opportunities": [ { "category": "...", "title": "...", "description": "korte uitleg", "example": "voorbeeld", "expectedValue": "waarde", "requiredData": "data", "firstTest": "test 30 dagen", "scores": { "value": 8, "feasibility": 7, "dataNeed": 6, "wow": 5 }, "priority": "Quick win", "marketContext": { "maturity": "Bestaat generiek", "existingSolutions": "2-3 concrete tools/bedrijven", "gap": "wat mist nog" } } ]
}

Regels:
- Exact 5 kansen, 1 per categorie in volgorde: "Artikeldata", "Klantadvies", "Logistiek & voorraad", "Duurzaamheid & circulariteit", "Commerciële waarde"
- priority: exact één van "Quick win", "Strategische kans", "Later onderzoeken", "Niet direct relevant"
- scores: integers 1-10
- maturity: exact één van "Nog niet", "In opkomst", "Bestaat generiek", "Volwassen markt"
- existingSolutions: noem 2-3 concrete tools/platforms/bedrijven (bijv. nesting-software, restpartij-marktplaatsen); zeg expliciet als niks bestaat
- gap: 1-2 zinnen wat mist voor DIT materiaal/keten/organisatie
- description en example: max 25 woorden
- Zakelijk, concreet, bouwspecifiek, Nederlands
- Alleen Latijnse tekens`;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.6);
  doc.fillColor("#0a2d5e").fontSize(14).font("Helvetica-Bold").text(text);
  doc.moveTo(doc.x, doc.y + 2).lineTo(555, doc.y + 2).strokeColor("#e78a3c").lineWidth(2).stroke();
  doc.moveDown(0.4);
  doc.fillColor("#1a1a1a").font("Helvetica").fontSize(10);
}

function generatePdf(payload: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { material, organization, challenge, ambition, result } = payload;

      // Header
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
        [organization && `Organisatie: ${organization}`, challenge && `Uitdaging: ${challenge}`, ambition && `Ambitie: ${ambition}`]
          .filter(Boolean)
          .join("   •   ")
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
      opps.forEach((o: any, i: number) => {
        if (doc.y > 720) doc.addPage();
        doc.font("Helvetica-Bold").fillColor("#0a2d5e").fontSize(11).text(`${i + 1}. ${o.category} — ${o.title}`);
        doc.font("Helvetica").fillColor("#1a1a1a").fontSize(9.5);
        doc.text(o.description);
        doc.fillColor("#555").text(`Voorbeeld: ${o.example}`);
        doc.text(`Verwachte waarde: ${o.expectedValue}`);
        doc.text(`Benodigde data: ${o.requiredData}`);
        doc.text(`Eerste test (30 dagen): ${o.firstTest}`);
        if (o.scores) {
          doc.fillColor("#0a2d5e").text(
            `Scores — Waarde ${o.scores.value}/10 · Haalbaarheid ${o.scores.feasibility}/10 · Databehoefte ${o.scores.dataNeed}/10 · Wow ${o.scores.wow}/10   [${o.priority}]`
          );
        }
        if (o.marketContext) {
          doc.moveDown(0.3);
          doc.font("Helvetica-Bold").fillColor("#e78a3c").fontSize(9).text(`Wat bestaat er al in de markt — ${o.marketContext.maturity}`);
          doc.font("Helvetica").fillColor("#1a1a1a").fontSize(9.5);
          if (o.marketContext.existingSolutions) doc.text(`Bestaande oplossingen: ${o.marketContext.existingSolutions}`);
          if (o.marketContext.gap) doc.text(`Wat nog ontbreekt: ${o.marketContext.gap}`);
        }
        doc.fillColor("#1a1a1a").moveDown(0.5);
      });

      doc.moveDown(1.5);
      doc.fontSize(8).fillColor("#888").text("© 2026 Bouwmateriaal AI Lab · Gemaakt door Merkvast · Deze kaart is een startmotor voor innovatiegesprekken, geen eindantwoord.", { align: "center" });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.post("/api/generate", async (req, res) => {
    try {
      const parsed = generateSchema.parse(req.body);

      // Rate limit: totaal aantal generaties per dag
      const currentGen = await storage.countGenerationsToday();
      if (currentGen >= LIMITS.GENERATE_TOTAL) {
        // trigger block-alert (idempotent)
        void maybeAlert("generate", "total", currentGen, LIMITS.GENERATE_TOTAL);
        return res.status(429).json({
          error: "Dagelijkse limiet bereikt",
          detail: `We hebben vandaag het maximum aantal kansenkaarten al gegenereerd (${LIMITS.GENERATE_TOTAL}). Probeer het morgen opnieuw of neem contact op met Merkvast.`,
        });
      }

      const prompt = buildPrompt(parsed.material, parsed.organization, parsed.challenge, parsed.ambition);

      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const text = msg.content[0].type === "text" ? msg.content[0].text : "";
      const jsonText = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
      let result;
      try {
        result = JSON.parse(jsonText);
      } catch {
        // try to extract JSON object, repair trailing commas and unclosed braces/brackets
        const m = jsonText.match(/\{[\s\S]*\}/) || [jsonText];
        let candidate = m[0];
        // remove trailing commas before ] or }
        candidate = candidate.replace(/,\s*(\]|\})/g, "$1");
        try {
          result = JSON.parse(candidate);
        } catch {
          // best-effort: balance braces
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
        ambition: parsed.ambition || null,
      });

      // Alert-check ná succesvolle insert
      void maybeAlert("generate", "total", currentGen + 1, LIMITS.GENERATE_TOTAL);

      res.json(result);
    } catch (err: any) {
      console.error("generate error", err);
      res.status(500).json({ error: err?.message || "Er ging iets mis bij het genereren." });
    }
  });

  app.post("/api/lead", async (req, res) => {
    try {
      const body = req.body || {};

      // Rate limits vóór insert: totaal + per e-mail
      const email = String(body.email || "").trim().toLowerCase();
      if (email) {
        const perEmail = await storage.countPdfsTodayForEmail(email);
        if (perEmail >= LIMITS.PDF_PER_EMAIL) {
          void maybeAlert("pdf", "email", perEmail, LIMITS.PDF_PER_EMAIL, email);
          return res.status(429).json({
            error: "Limiet per e-mailadres bereikt",
            detail: `Je hebt vandaag al ${LIMITS.PDF_PER_EMAIL} PDF-kansenkaarten aangevraagd op dit e-mailadres. Probeer het morgen opnieuw.`,
          });
        }
      }
      // AVG-toestemming is verplicht voor het PDF-verzoek
      if (!body.consent) {
        return res.status(400).json({
          error: "Toestemming ontbreekt",
          detail: "Bevestig de toestemmingsvinkje om je PDF-kansenkaart te ontvangen.",
        });
      }

      const totalPdfs = await storage.countPdfsToday();
      if (totalPdfs >= LIMITS.PDF_TOTAL) {
        void maybeAlert("pdf", "total", totalPdfs, LIMITS.PDF_TOTAL);
        return res.status(429).json({
          error: "Dagelijkse PDF-limiet bereikt",
          detail: `We hebben vandaag het maximum aantal PDF-kansenkaarten al verstuurd (${LIMITS.PDF_TOTAL}). Probeer het morgen opnieuw.`,
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
        consentAt: body.consent ? new Date().toISOString() : null,
      });

      await storage.createLead(leadInput);

      const pdfBuffer = await generatePdf({
        material: body.material,
        organization: body.organization,
        challenge: body.challenge,
        ambition: body.ambition,
        result: body.result,
      });

      const safeName = String(body.material || "materiaal").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const filename = `ai-kansenkaart-${safeName || "bouwmateriaal"}.pdf`;

      // Alert-checks ná succesvolle insert (no-op qua mail, houdt tracking wel bij)
      if (email) {
        void maybeAlert("pdf", "email", (await storage.countPdfsTodayForEmail(email)), LIMITS.PDF_PER_EMAIL, email);
      }
      void maybeAlert("pdf", "total", totalPdfs + 1, LIMITS.PDF_TOTAL);

      res.json({
        pdfBase64: pdfBuffer.toString("base64"),
        filename,
      });
    } catch (err: any) {
      console.error("lead error", err);
      res.status(500).json({ error: err?.message || "Er ging iets mis bij het opslaan." });
    }
  });

  app.get("/api/leads", async (req, res) => {
    const providedToken = (req.headers["x-admin-token"] as string | undefined) ?? (req.query.token as string | undefined);
    const expectedToken = process.env.ADMIN_TOKEN;
    if (!expectedToken || providedToken !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const rows = await storage.listLeads();
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  return httpServer;
}
