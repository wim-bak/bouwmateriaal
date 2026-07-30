# Bouwmateriaal AI Lab — Bouwspec

Interactieve web-app die managers in de bouwmaterialenketen helpt AI-kansen te ontdekken op basis van één ingevoerd bouwmateriaal.

## Doelgroep
- Management bouwgroothandels
- Fabrikanten en toeleveranciers
- Product-, commercieel-, marketing- en innovatiemanagers

## Kernbelofte
"Voer een bouwmateriaal in en ontdek hoe AI kan helpen bij betere data, duurzamer advies, slimmere logistiek, hogere marge en nieuwe toepassingen."

## Visuele stijl
- Zakelijk, modern, helder, veel witruimte
- Kleuren: **donkerblauw** (`214 85% 20%` — primary), **lichtblauw** (`205 75% 55%` — accent/secondary), **warm oranje** (`22 90% 55%` — highlight/CTA-accent)
- Achtergrond: lichtgrijs/wit (`210 20% 98%`), kaarten wit
- Iconen: `lucide-react` (Building2, Package, TrendingUp, Truck, Leaf, DollarSign, Sparkles, ArrowRight, etc.)
- Kaarten, scorebalken, matrix-visualisatie
- Praktisch bouwgericht, niet techy AI-esthetiek

## Structuur (single-page app, hash routing)

### Pagina 1: Home (`/`)
- **Navbar**: Logo (SVG) links + "Bouwmateriaal AI Lab" + rechts links naar #verkenner, #voorbeelden, #over
- **Hero**: 
  - Titel: "Ontdek de AI-kansen achter ieder bouwmateriaal"
  - Subtitel: "Van isolatie tot beton, van hout tot gevelbekleding. Bouwmateriaal AI Lab vertaalt materialen naar concrete AI-toepassingen voor commercie, logistiek, duurzaamheid en klantadvies."
  - CTA-knop: "Start de materiaalverkenning" → scroll naar #verkenner
  - Achtergrond: subtiel grid/pattern of donkerblauw met accent oranje
- **3-stappen sectie** (kaarten met nummer + icoon):
  1. Voer een bouwmateriaal in
  2. Kies je uitdaging
  3. Ontvang een AI-kansenkaart

### Pagina 2: Materiaalverkenner (`#verkenner`, sectie op home)
Interactief formulier:
- **Bouwmateriaal** (verplicht tekstveld, met placeholder & voorbeeldchips: isolatie, kalkzandsteen, betonplaat, hout, dakpan, gevelbekleding, bevestigingsmateriaal)
- **Type organisatie** (dropdown): Bouwgroothandel, Fabrikant, Toeleverancier, Aannemer, Ontwikkelaar
- **Belangrijkste uitdaging** (dropdown): Meer marge, Minder verspilling, Duurzamer advies, Betere artikeldata, Slimmere logistiek, Betere klantkeuze, Nieuwe toepassing
- **Ambitieniveau** (radio/segmented): Quick win, Strategische kans, Moonshot
- Knop: "Genereer AI-Kansenkaart"

### Pagina 3: AI-Kansenkaart Resultaat (`#/resultaat`)
Toont het gegenereerde resultaat:

**A. Materiaalprofiel** (bovenaan, card)
- Korte omschrijving
- Belangrijke eigenschappen (bullets)
- Veelvoorkomende klantvragen (bullets)
- Mogelijke knelpunten in de keten (bullets)

**B. Vijf AI-kansen** (grid van 5 kaarten, elk met icoon):
1. Artikeldata (Package)
2. Klantadvies (Users/MessageSquare)
3. Logistiek & voorraad (Truck)
4. Duurzaamheid & circulariteit (Leaf)
5. Commerciële waarde (TrendingUp)

Per kaart:
- Titel + gekleurd icoon
- Korte uitleg
- Voorbeeldtoepassing
- Verwachte waarde
- Benodigde data
- Eerste test binnen 30 dagen
- Scorebalken (waarde, haalbaarheid, databehoefte, wow-factor) — horizontale bars
- Prioriteitslabel (Quick win / Strategische kans / Later onderzoeken / Niet direct relevant) — gekleurde badge

**C. Prioriteitenmatrix** (2x2 grid)
- Assen: waarde (y) × haalbaarheid (x)
- Vier kwadranten: Quick wins, Strategische kansen, Later onderzoeken, Niet direct relevant
- De 5 kansen als bolletjes/labels in de juiste kwadrant

**D. Mini-businesscase** (knop + drawer/sectie)
Knop "Maak mini-businesscase" → toont onder:
- Probleem
- AI-oplossing
- Doelgroep
- Benodigde data
- Eerste experiment
- Verwachte waarde
- Vervolgstap

**E. PDF-export via email** (aan het eind)
Card: "Ontvang de kansenkaart als PDF in je mailbox"
- Naam-veld (verplicht)
- Bedrijf-veld (verplicht)
- Emailveld (verplicht)
- Knop: "Stuur PDF naar mijn mail"
- Leads worden opgeslagen in SQLite tabel `leads` (met verzoek, timestamp)

### Pagina 4: Voorbeelden (`#voorbeelden`, sectie op home)
3 vooraf gedefinieerde kaarten met complete AI-kansenkaarten (client-side hardcoded, geen API-call nodig):
- Isolatie
- Kalkzandsteen
- Houten gevelbekleding

Elk als klikbare kaart die de resultatenpagina toont met vooraf-ingevulde data.

### Pagina 5: Over de tool (`#over`, sectie op home)
"Deze tool is geen eindantwoord, maar een startmotor voor innovatiegesprekken. De uitkomsten helpen managementteams om sneller te bepalen waar AI waarde kan toevoegen."
+ Korte uitleg over gebruik in MT/innovatiesessie/commercieel overleg.

Footer: © 2026 Bouwmateriaal AI Lab · Gemaakt door Merkvast

## Backend

### Database (SQLite via Drizzle)
Twee tabellen:

```ts
// leads: elke email-aanvraag / gebruik van de tool
leads: {
  id: integer primary key autoincrement
  name: text
  company: text
  email: text notNull
  material: text notNull
  organization: text
  challenge: text
  ambition: text
  resultJson: text (het gegenereerde resultaat als JSON)
  createdAt: text default now
}

// materialQueries: elke gegenereerde query (analytics)
materialQueries: {
  id: integer primary key autoincrement
  material: text notNull
  organization: text
  challenge: text
  ambition: text
  createdAt: text default now
}
```

### API Routes
- `POST /api/generate` — genereer AI-kansenkaart via Claude
  - Body: `{ material, organization, challenge, ambition }`
  - Roept Claude aan met de prompt (zie onder), verwacht JSON output
  - Slaat query op in `materialQueries`
  - Retourneert het gestructureerde resultaat
  
- `POST /api/lead` — sla email lead op + genereer PDF
  - Body: `{ name, company, email, material, organization, challenge, ambition, result }`
  - Sla op in `leads` tabel
  - Genereer PDF via pdfkit
  - Return PDF als base64 in JSON of als download-URL
  - (Email versturen valt buiten scope zonder SMTP — geef in UI aan: "PDF is klaar, download hier" + de PDF wordt getoond als download)

- `GET /api/leads` — (optioneel, admin) — lijst alle leads

### LLM-integratie
Node.js: gebruik `@anthropic-ai/sdk`:
```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // baseURL & key komen uit env via llm-api:website credentials
const response = await client.messages.create({
  model: "claude_sonnet_4_6",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
});
```

Env-var mapping voor Anthropic SDK: het `llm-api:website` preset zet automatisch de juiste `ANTHROPIC_BASE_URL` en `ANTHROPIC_API_KEY` env-vars.

### Prompt voor Claude
```
Je bent een strategisch AI-adviseur voor de bouwmaterialenketen.

Analyseer het volgende bouwmateriaal: {MATERIAAL}

Context:
- Type organisatie: {ORGANISATIE}
- Belangrijkste uitdaging: {UITDAGING}
- Ambitieniveau: {AMBITIENIVEAU}

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
      "priority": "Quick win"
    },
    ... (5 kansen totaal, één per categorie: Artikeldata, Klantadvies, Logistiek & voorraad, Duurzaamheid & circulariteit, Commerciële waarde)
  ],
  "businessCase": {
    "problem": "Probleem",
    "aiSolution": "AI-oplossing",
    "targetGroup": "Doelgroep",
    "requiredData": "Benodigde data",
    "firstExperiment": "Eerste experiment",
    "expectedValue": "Verwachte waarde",
    "nextStep": "Vervolgstap"
  }
}

De businessCase betreft de meest kansrijke opportunity. Priority-waarden zijn: "Quick win", "Strategische kans", "Later onderzoeken", "Niet direct relevant". Alle scores zijn integers van 1-10. Schrijf zakelijk, concreet en bouwspecifiek in het Nederlands. Vermijd algemene AI-taal.
```

Parse response.content[0].text als JSON (strip eventuele markdown code fences).

## PDF Generatie (Node)
Gebruik `pdfkit` (installeren met `npm install pdfkit @types/pdfkit`):
- Header met logo + "Bouwmateriaal AI Lab"
- Titel: "AI-Kansenkaart voor {materiaal}"
- Context (organisatie, uitdaging, ambitie)
- Materiaalprofiel
- 5 kansen met scores
- Mini-businesscase
- Footer met Merkvast branding

## Voorbeelddata (client-side hardcoded)
Maak in `client/src/data/examples.ts` drie complete voorbeeldresultaten voor:
- Isolatie (bouwgroothandel, duurzamer advies, strategische kans)
- Kalkzandsteen (fabrikant, meer marge, quick win)
- Houten gevelbekleding (toeleverancier, nieuwe toepassing, moonshot)

Elk voorbeeld heeft dezelfde JSON-structuur als de LLM-output, inhoudelijk goed uitgeschreven, bouwspecifiek.

## UX-eisen
- Resultaat binnen 30 seconden zichtbaar (loading state met skeleton + progressbericht "AI-Kansenkaart wordt samengesteld…")
- Output volledig scanbaar, veel witruimte
- Print-friendly (media print styles)
- Responsive (mobile-first)
- Nederlandse tone-of-voice: zakelijk, prikkelend, praktisch, niet-technisch, beslissersgericht

## Tech Stack (uit template)
- React + Vite + TailwindCSS + shadcn/ui
- wouter (hash routing)
- @tanstack/react-query (data fetching)
- Express + Drizzle + better-sqlite3 (backend)
- @anthropic-ai/sdk (LLM)
- pdfkit (PDF-generatie)
- lucide-react (iconen)
- framer-motion (subtiele animaties bij scroll/enter)
