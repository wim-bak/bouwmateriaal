import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage, LIMITS, todayKey } from "./storage";
import { insertLeadSchema } from "@shared/schema";
import Anthropic from "@anthropic-ai/sdk";
import PDFDocument from "pdfkit";
import { z } from "zod";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY + ANTHROPIC_BASE_URL from env

// Resend email — uses the custom-cred:api.resend.com credential injected via api_credentials.
// The credential proxy rewrites requests to api.resend.com and adds the Bearer token automatically.
const RESEND_ENABLED = true;
// Use onboarding@resend.dev by default so verzending werkt zonder gerifieerd domein.
// Zet dit op noreply@merkvast.com zodra merkvast.com in Resend geverifieerd is.
const MAIL_FROM = "Bouwmateriaal AI Lab <onboarding@resend.dev>";
const MAIL_BCC = "wim@merkvast.com";

async function sendLeadEmail(opts: {
  to: string;
  name: string | null;
  company: string | null;
  material: string;
  organization: string | null;
  challenge: string | null;
  ambition: string | null;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{ ok: boolean; error?: string; id?: string }> {
  if (!RESEND_ENABLED) return { ok: false, error: "Resend niet geconfigureerd" };
  try {
    const greeting = opts.name ? `Beste ${opts.name},` : "Beste,";
    const context = [
      opts.organization && `Organisatie: ${opts.organization}`,
      opts.challenge && `Uitdaging: ${opts.challenge}`,
      opts.ambition && `Ambitieniveau: ${opts.ambition}`,
    ].filter(Boolean).join(" · ");

    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f7fb;margin:0;padding:24px;color:#1a1a1a">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(10,45,94,.08)">
    <div style="background:#0a2d5e;padding:24px 28px;color:#ffffff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#a9c6e8">Bouwmateriaal AI Lab</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">Jouw AI-Kansenkaart voor ${escapeHtml(opts.material)}</div>
    </div>
    <div style="padding:28px">
      <p>${escapeHtml(greeting)}</p>
      <p>Bedankt voor het gebruiken van Bouwmateriaal AI Lab. In de bijlage vind je de AI-Kansenkaart voor <strong>${escapeHtml(opts.material)}</strong> met vijf concrete AI-kansen, scores en marktcontext per kans.</p>
      ${context ? `<p style="background:#f0f4fa;border-left:3px solid #e78a3c;padding:12px 14px;margin:18px 0;font-size:14px;color:#334">${escapeHtml(context)}</p>` : ""}
      <p><strong>Zo gebruik je de kaart:</strong></p>
      <ul style="padding-left:20px;line-height:1.6">
        <li>Bespreek de kansen in een MT- of innovatiesessie.</li>
        <li>Kies één quick win voor een experiment van 30 dagen.</li>
        <li>Gebruik de marktcontext om onderscheidend vermogen te bepalen.</li>
      </ul>
      <p style="margin-top:22px;color:#555;font-size:13px">Deze kaart is een startmotor voor innovatiegesprekken, geen eindantwoord. Heb je vragen of wil je sparren? Beantwoord deze mail dan gerust.</p>
    </div>
    <div style="background:#f5f7fb;padding:16px 28px;font-size:12px;color:#7a869a;text-align:center">
      © 2026 Bouwmateriaal AI Lab · Gemaakt door Merkvast
    </div>
  </div>
</body></html>`;

    const text = `${greeting}\n\nIn de bijlage vind je de AI-Kansenkaart voor ${opts.material}.\n${context ? context + "\n" : ""}\nBespreek de kansen in een MT- of innovatiesessie en kies één quick win voor een experiment van 30 dagen.\n\n— Bouwmateriaal AI Lab · Merkvast`;

    const payload: any = {
      from: MAIL_FROM,
      to: [opts.to],
      bcc: MAIL_BCC ? [MAIL_BCC] : undefined,
      subject: `AI-Kansenkaart voor ${opts.material}`,
      html,
      text,
      attachments: [
        {
          filename: opts.filename,
          content: opts.pdfBuffer.toString("base64"),
        },
      ],
    };

    // Resolve credential endpoint & token from injected env vars (custom-cred:api.resend.com).
    // The URL env points to the proxy host; we still append the Resend REST path.
    const proxyUrl = process.env.CUSTOM_CRED_API_RESEND_COM_URL;
    const proxyToken = process.env.CUSTOM_CRED_API_RESEND_COM_TOKEN;
    if (!proxyUrl || !proxyToken) {
      return { ok: false, error: "Geen Resend-credential gevonden in de omgeving" };
    }
    // Strip trailing slash so we can safely append /emails
    const endpoint = proxyUrl.replace(/\/+$/, "") + "/emails";
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": proxyToken,
        Authorization: `Bearer ${proxyToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Resend error", resp.status, errText);
      return { ok: false, error: `Resend ${resp.status}: ${errText.slice(0, 200)}` };
    }
    const data: any = await resp.json();
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error("sendLeadEmail exception", err);
    return { ok: false, error: err?.message || "Onbekende fout" };
  }
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Fire-and-forget alert e-mail naar de eigenaar bij 80% / 100% van een limiet.
async function sendLimitAlert(opts: {
  kind: "generate" | "pdf";
  scope: "total" | "email";
  level: "warn" | "block";
  current: number;
  limit: number;
  email?: string;
}): Promise<void> {
  try {
    const proxyUrl = process.env.CUSTOM_CRED_API_RESEND_COM_URL;
    const proxyToken = process.env.CUSTOM_CRED_API_RESEND_COM_TOKEN;
    if (!proxyUrl || !proxyToken) return;
    const endpoint = proxyUrl.replace(/\/+$/, "") + "/emails";

    const kindLabel = opts.kind === "generate" ? "Kansenkaart-generaties" : "PDF-verzendingen";
    const scopeLabel = opts.scope === "email" ? `per e-mailadres (${opts.email})` : "totaal (dagelijks)";
    const levelLabel = opts.level === "warn" ? "⚠️ 80% bereikt" : "🛑 100% bereikt · gebruikers worden nu geblokkeerd";
    const subject = `[Bouwmateriaal AI Lab] ${levelLabel} — ${kindLabel}`;

    const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f5f7fb;margin:0;padding:24px;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(10,45,94,.08)">
    <div style="background:${opts.level === "block" ? "#b13a2c" : "#e78a3c"};padding:22px 26px;color:#fff">
      <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Bouwmateriaal AI Lab · Alert</div>
      <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(levelLabel)}</div>
    </div>
    <div style="padding:24px 26px">
      <p style="margin:0 0 12px"><strong>${escapeHtml(kindLabel)}</strong> — ${escapeHtml(scopeLabel)}</p>
      <p style="margin:0 0 12px;font-size:18px"><strong>${opts.current} / ${opts.limit}</strong></p>
      ${opts.level === "warn"
        ? '<p style="color:#555;font-size:14px">De limiet is nog niet bereikt. Gebruikers kunnen doorgaan. Overweeg of je de limiet wilt verhogen of laten staan.</p>'
        : '<p style="color:#555;font-size:14px">Nieuwe aanvragen op dit onderdeel worden nu geweigerd tot morgen (UTC 00:00). Log in op de app-omgeving om de limiet aan te passen.</p>'}
      <p style="color:#7a869a;font-size:12px;margin-top:20px">Datum (UTC): ${todayKey()}</p>
    </div>
  </div>
</body></html>`;

    const payload = {
      from: MAIL_FROM,
      to: ["wim@merkvast.com"],
      subject,
      html,
      text: `${subject}\n\n${kindLabel} ${scopeLabel}: ${opts.current} / ${opts.limit}\nDatum (UTC): ${todayKey()}`,
    };

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": proxyToken,
        Authorization: `Bearer ${proxyToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("limit alert email failed", resp.status, t.slice(0, 200));
    }
  } catch (e: any) {
    console.error("sendLimitAlert exception", e?.message || e);
  }
}

// Verstuur alert bij overschrijding drempel, éénmaal per dag per (kind,scope,level).
async function maybeAlert(
  kind: "generate" | "pdf",
  scope: "total" | "email",
  current: number,
  limit: number,
  email?: string,
): Promise<void> {
  const day = todayKey();
  const ratio = current / limit;
  if (ratio >= 1) {
    const already = await storage.wasAlertSent(day, kind, scope, "block");
    if (!already) {
      await storage.markAlertSent(day, kind, scope, "block");
      await sendLimitAlert({ kind, scope, level: "block", current, limit, email });
    }
    return;
  }
  if (ratio >= LIMITS.ALERT_THRESHOLD) {
    const already = await storage.wasAlertSent(day, kind, scope, "warn");
    if (!already) {
      await storage.markAlertSent(day, kind, scope, "warn");
      await sendLimitAlert({ kind, scope, level: "warn", current, limit, email });
    }
  }
}

const generateSchema = z.object({
  material: z.string().min(1),
  organization: z.string().optional().default(""),
  challenge: z.string().optional().default(""),
  ambition: z.string().optional().default(""),
});

function buildPrompt(material: string, organization: string, challenge: string, ambition: string) {
  return `Je bent een strategisch AI-adviseur voor de bouwmaterialenketen.

Analyseer het volgende bouwmateriaal: ${material}

Context:
- Type organisatie: ${organization || "Onbekend"}
- Belangrijkste uitdaging: ${challenge || "Onbekend"}
- Ambitieniveau: ${ambition || "Onbekend"}

Geef een concrete AI-Kansenkaart voor dit materiaal.

Retourneer UITSLUITEND geldig JSON in exact deze structuur:
{
  "materialProfile": {
    "description": "Korte omschrijving van het materiaal",
    "properties": ["eigenschap 1", "eigenschap 2", "eigenschap 3", "eigenschap 4"],
    "customerQuestions": ["vraag 1", "vraag 2", "vraag 3"],
    "chainChallenges": ["knelpunt 1", "knelpunt 2", "knelpunt 3"]
  },
  "opportunities": [
    {
      "category": "Artikeldata",
      "title": "Titel van de kans",
      "description": "Korte uitleg",
      "example": "Voorbeeldtoepassing",
      "expectedValue": "Verwachte waarde",
      "requiredData": "Benodigde data",
      "firstTest": "Eerste test binnen 30 dagen",
      "scores": { "value": 8, "feasibility": 7, "dataNeed": 6, "wow": 5 },
      "priority": "Quick win",
      "marketContext": {
        "maturity": "Bestaat generiek",
        "existingSolutions": "Concrete tools of bedrijven die dit al aanbieden, bij voorkeur met 2-3 naam-voorbeelden. Wees eerlijk als er alleen generieke tools bestaan die niet specifiek voor dit materiaal getraind zijn.",
        "gap": "Wat ontbreekt er nog specifiek voor DIT materiaal, DEZE organisatie of DEZE keten. Waarom is er nog ruimte voor eigen initiatief."
      }
    }
  ]
}

Geef exact 5 kansen totaal, één per categorie in deze volgorde: "Artikeldata", "Klantadvies", "Logistiek & voorraad", "Duurzaamheid & circulariteit", "Commerciële waarde". Priority-waarden zijn: "Quick win", "Strategische kans", "Later onderzoeken", "Niet direct relevant". Alle scores zijn integers van 1-10.

Voor het veld marketContext gelden deze regels:
- maturity: kies exact één van "Nog niet", "In opkomst", "Bestaat generiek", "Volwassen markt". "Nog niet" = geen bekende tools; "In opkomst" = eerste startups/pilots; "Bestaat generiek" = generieke oplossingen die niet specifiek voor deze branche/materiaal zijn getraind; "Volwassen markt" = meerdere gevestigde aanbieders met branchefocus.
- existingSolutions: noem waar mogelijk 2-3 concrete tools, platforms of bedrijven die dit al doen (bv. nesting-software, marktplaatsen voor restpartijen, calculatie-tools voor aannemers). Als er niets bestaat, schrijf dat expliciet.
- gap: leg in één of twee zinnen uit wat er nog mist voor DIT specifieke materiaal, deze keten of deze organisatie. Waarom is er nog ruimte om zelf iets op te bouwen.

Schrijf zakelijk, concreet en bouwspecifiek in het Nederlands. Vermijd algemene AI-taal. Gebruik uitsluitend Latijnse tekens (Nederlands of Engels) — geen Chinese, Japanse, Cyrillische of andere niet-Latijnse karakters, ook niet per ongeluk in samenstellingen of vertalingen.`;
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
        model: "claude_sonnet_4_6",
        max_tokens: 8192,
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

      // Try to send the PDF by email via Resend. Never fail the request if email fails —
      // the user still gets the PDF as a browser download from the JSON response.
      let emailStatus: { sent: boolean; error?: string } = { sent: false };
      if (leadInput.email) {
        const result = await sendLeadEmail({
          to: leadInput.email,
          name: leadInput.name || null,
          company: leadInput.company || null,
          material: leadInput.material,
          organization: leadInput.organization || null,
          challenge: leadInput.challenge || null,
          ambition: leadInput.ambition || null,
          pdfBuffer,
          filename,
        });
        emailStatus = result.ok ? { sent: true } : { sent: false, error: result.error };
      }

      // Alert-checks ná succesvolle insert
      if (email) {
        void maybeAlert("pdf", "email", (await storage.countPdfsTodayForEmail(email)), LIMITS.PDF_PER_EMAIL, email);
      }
      void maybeAlert("pdf", "total", totalPdfs + 1, LIMITS.PDF_TOTAL);

      res.json({
        pdfBase64: pdfBuffer.toString("base64"),
        filename,
        emailSent: emailStatus.sent,
        emailError: emailStatus.error,
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
