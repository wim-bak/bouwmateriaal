import type { KansenkaartResult, FormInputs } from "@/lib/types";

export interface ExampleEntry {
  key: string;
  label: string;
  subtitle: string;
  inputs: FormInputs;
  result: KansenkaartResult;
}

export const examples: ExampleEntry[] = [
  {
    key: "isolatie",
    label: "Isolatie",
    subtitle: "Bouwgroothandel · Duurzamer advies · Strategische kans",
    inputs: {
      material: "Isolatie",
      organization: "Bouwgroothandel",
      challenge: "Duurzamer advies",
      ambition: "Strategische kans",
    },
    result: {
      materialProfile: {
        description:
          "Isolatiemateriaal (glaswol, steenwol, PIR/PUR, EPS en biobased varianten) beperkt warmteverlies en is de spil in verduurzaming van bestaande en nieuwe gebouwen. De keuze hangt sterk af van toepassing, Rc-waarde, brandklasse en beschikbare ruimte.",
        properties: [
          "Thermische prestatie uitgedrukt in lambda- en Rc-waarde",
          "Sterk uiteenlopende materiaalfamilies (minerale wol, kunststofschuim, biobased)",
          "Brandklasse en dampopenheid bepalen toepasbaarheid",
          "Volumineus product: transport en opslag drukken op marge",
        ],
        customerQuestions: [
          "Welke isolatie haalt de vereiste Rc-waarde binnen mijn beschikbare spouw of dakdikte?",
          "Wat is het verschil in prestatie en prijs tussen minerale wol en PIR?",
          "Welke biobased alternatieven tellen mee voor de MPG-eis?",
        ],
        chainChallenges: [
          "Artikeldata over lambda, brandklasse en dikte is versnipperd en inconsistent tussen leveranciers",
          "Adviseurs aan de balie kunnen zelden snel de juiste Rc-berekening onderbouwen",
          "Retourstromen en snijverlies zorgen voor verspilling en margeverlies",
        ],
      },
      opportunities: [
        {
          category: "Artikeldata",
          title: "Geharmoniseerde isolatie-attributen uit datasheets",
          description:
            "Een AI-model leest technische datasheets en DoP's uit en vult lambda-waarde, brandklasse, dikte en Rc-waarde automatisch en uniform in de PIM.",
          example:
            "Upload 500 leveranciersdatasheets; het model normaliseert lambda-waarden en detecteert ontbrekende brandklasses voor correctie.",
          expectedValue: "40% minder handmatig datawerk en betrouwbare filters voor de klant",
          requiredData: "PDF-datasheets, DoP's en de bestaande PIM-structuur",
          firstTest: "Extractie testen op één productgroep dakisolatie en resultaat controleren tegen de datasheet",
          scores: { value: 8, feasibility: 8, dataNeed: 6, wow: 5 },
          priority: "Quick win",
        },
        {
          category: "Klantadvies",
          title: "Rc-adviesassistent aan de balie",
          description:
            "Een adviestool berekent op basis van constructietype en gewenste Rc-waarde direct welke isolatie en dikte passen, inclusief duurzaam alternatief.",
          example:
            "Balieverkoper voert 'plat dak, Rc 6,0' in en krijgt drie passende opties met dikte, prijs en MPG-score.",
          expectedValue: "Sneller en consistenter advies, hogere conversie op duurzame keuzes",
          requiredData: "Productattributen, Rc-rekenregels en prijsdata",
          firstTest: "Pilot bij twee vestigingen met de vijf meest verkochte daktoepassingen",
          scores: { value: 9, feasibility: 6, dataNeed: 7, wow: 8 },
          priority: "Strategische kans",
        },
        {
          category: "Logistiek & voorraad",
          title: "Voorspelde vraag per seizoen en regio",
          description:
            "AI voorspelt isolatievraag op basis van weer, subsidierondes en renovatieprojecten zodat volumineuze voorraad slimmer wordt verdeeld.",
          example:
            "Model signaleert piek in spouwisolatie na aankondiging ISDE-subsidie en adviseert bijbestellen per regio.",
          expectedValue: "Minder nee-verkoop en lagere opslagkosten voor volumineuze producten",
          requiredData: "Historische verkoopdata, subsidiekalender en projectpijplijn",
          firstTest: "Backtest voorspelling op vorig jaar voor één regio en meet afwijking",
          scores: { value: 7, feasibility: 6, dataNeed: 7, wow: 6 },
          priority: "Strategische kans",
        },
        {
          category: "Duurzaamheid & circulariteit",
          title: "MPG- en CO2-labeling van het assortiment",
          description:
            "Automatische verrijking van producten met MPG-bijdrage en CO2-footprint, zodat klanten kunnen filteren op milieuprestatie.",
          example:
            "Klant filtert op laagste MPG per Rc-punt en krijgt biobased isolatie bovenaan met onderbouwing.",
          expectedValue: "Onderscheidend duurzaam profiel en voorsprong op aankomende regelgeving",
          requiredData: "EPD's, NMD-data en productsamenstelling",
          firstTest: "Koppel NMD-categorieën aan 50 hardlopers en toon een MPG-indicatie",
          scores: { value: 9, feasibility: 5, dataNeed: 8, wow: 8 },
          priority: "Strategische kans",
        },
        {
          category: "Commerciële waarde",
          title: "Cross-sell van complete isolatiesystemen",
          description:
            "AI stelt op basis van de gekozen isolatie automatisch het bijbehorende systeem samen: dampremmer, tape, bevestiging en afwerking.",
          example:
            "Bij bestelling PIR-dakisolatie adviseert het systeem passende dampremmende folie en tape met juiste hoeveelheid.",
          expectedValue: "Hogere ordergrootte en minder incomplete leveringen op de bouw",
          requiredData: "Verkoophistorie, product-combinaties en verwerkingsvoorschriften",
          firstTest: "Analyseer welke artikelen nu al samen worden gekocht en toets één bundeladvies",
          scores: { value: 8, feasibility: 7, dataNeed: 5, wow: 6 },
          priority: "Quick win",
        },
      ],
    },
  },
  {
    key: "kalkzandsteen",
    label: "Kalkzandsteen",
    subtitle: "Fabrikant · Meer marge · Quick win",
    inputs: {
      material: "Kalkzandsteen",
      organization: "Fabrikant",
      challenge: "Meer marge",
      ambition: "Quick win",
    },
    result: {
      materialProfile: {
        description:
          "Kalkzandsteen is een dragend en niet-dragend metselmateriaal van kalk en zand, geliefd om zijn hoge druksterkte, geluidsisolatie en maatvastheid. Het wordt geleverd als lijmblokken, elementen en gezaagd maatwerk.",
        properties: [
          "Hoge druksterkte en uitstekende geluidsisolatie",
          "Maatvast en strak, geschikt voor dun-bed lijmwerk",
          "Zwaar product: transport bepaalt een groot deel van de kostprijs",
          "Leverbaar als standaard blokken en op maat gezaagde elementen",
        ],
        customerQuestions: [
          "Welke steensterkteklasse heb ik nodig voor deze dragende wand?",
          "Kan ik elementen op maat laten zagen om zaagverlies op de bouw te vermijden?",
          "Wat is de levertijd voor projectmatige hoeveelheden?",
        ],
        chainChallenges: [
          "Offertes voor maatwerk-elementen kosten veel calculatietijd en zijn foutgevoelig",
          "Transportkosten van zware pakketten drukken de marge onvoorspelbaar",
          "Zaagverlies en restpartijen op de bouw worden zelden teruggekoppeld naar de fabriek",
        ],
      },
      opportunities: [
        {
          category: "Artikeldata",
          title: "Automatische productteksten per sterkteklasse",
          description:
            "AI genereert consistente, SEO-vriendelijke product- en projectteksten per steenformaat en sterkteklasse vanuit de technische specificaties.",
          example:
            "Uit de specsheet van CS20-blokken rolt automatisch een verkoop- en webtekst met toepassing en verwerkingsadvies.",
          expectedValue: "Sneller nieuwe artikelen live en uniforme communicatie",
          requiredData: "Technische specificaties en bestaande productteksten",
          firstTest: "Genereer teksten voor één productlijn en laat productmanagement redigeren",
          scores: { value: 6, feasibility: 9, dataNeed: 4, wow: 4 },
          priority: "Quick win",
        },
        {
          category: "Klantadvies",
          title: "Slim zaagplan tegen zaagverlies",
          description:
            "Een tool berekent uit de wandtekening een optimaal zaag- en legplan voor elementen, met minimale reststukken.",
          example:
            "Aannemer uploadt wandmaten; het model levert een legplan dat zaagverlies met 15% verlaagt.",
          expectedValue: "Meer maatwerkorders en aantoonbaar minder materiaalverlies",
          requiredData: "Elementmaten, wandtekeningen en zaagregels",
          firstTest: "Toets het zaagplan op drie recente projecten en vergelijk met werkelijk verlies",
          scores: { value: 7, feasibility: 6, dataNeed: 6, wow: 7 },
          priority: "Strategische kans",
        },
        {
          category: "Logistiek & voorraad",
          title: "Slimmere ritplanning voor zware pakketten",
          description:
            "AI combineert orders en optimaliseert beladingsgraad en route, zodat transportkosten per pakket dalen.",
          example:
            "Model bundelt drie projectleveringen in de Randstad in één volle vracht in plaats van twee halve.",
          expectedValue: "Lagere transportkosten en directe margeverbetering op zware orders",
          requiredData: "Orderdata, laadgewichten, afleveradressen en transporttarieven",
          firstTest: "Analyseer één week aan ritten en simuleer de optimale bundeling",
          scores: { value: 8, feasibility: 7, dataNeed: 6, wow: 5 },
          priority: "Quick win",
        },
        {
          category: "Duurzaamheid & circulariteit",
          title: "Terugname en hergebruik van restpartijen",
          description:
            "AI matcht restpartijen en retourstromen van de ene bouw aan de vraag van een andere, met CO2-onderbouwing.",
          example:
            "Overgebleven CS12-blokken van project A worden aangeboden aan project B binnen dezelfde regio.",
          expectedValue: "Nieuwe circulaire propositie en minder afvalkosten",
          requiredData: "Voorraad restpartijen, projectvraag en locatiedata",
          firstTest: "Zet een eenvoudige matchlijst op tussen twee lopende projecten",
          scores: { value: 6, feasibility: 5, dataNeed: 7, wow: 7 },
          priority: "Later onderzoeken",
        },
        {
          category: "Commerciële waarde",
          title: "Snellere en scherpere maatwerkcalculatie",
          description:
            "AI schat op basis van wandoppervlak, complexiteit en historie direct een marge-veilige prijs voor maatwerk-offertes.",
          example:
            "Calculator voert projectgegevens in en krijgt binnen minuten een onderbouwde prijsindicatie in plaats van na een dag.",
          expectedValue: "Snellere offertes, hogere hitrate en betere margestuurbaarheid",
          requiredData: "Historische calculaties, marges en projectkenmerken",
          firstTest: "Train een schatting op 100 afgeronde offertes en vergelijk met de werkelijke prijs",
          scores: { value: 9, feasibility: 7, dataNeed: 6, wow: 7 },
          priority: "Quick win",
        },
      ],
    },
  },
  {
    key: "houten-gevelbekleding",
    label: "Houten gevelbekleding",
    subtitle: "Toeleverancier · Nieuwe toepassing · Moonshot",
    inputs: {
      material: "Houten gevelbekleding",
      organization: "Toeleverancier",
      challenge: "Nieuwe toepassing",
      ambition: "Moonshot",
    },
    result: {
      materialProfile: {
        description:
          "Houten gevelbekleding (o.a. thermisch gemodificeerd hout, western red cedar en vuren rabat) geeft gevels een natuurlijke uitstraling. Levensduur en onderhoud hangen sterk af van houtsoort, detaillering en oriëntatie op de zon.",
        properties: [
          "Natuurlijke uitstraling met vergrijzing over de tijd",
          "Levensduur afhankelijk van houtsoort, coating en detaillering",
          "Duurzaam en biobased, telt positief mee in de MPG",
          "Onderhoudsgevoelig bij verkeerde toepassing of oriëntatie",
        ],
        customerQuestions: [
          "Welke houtsoort past bij deze gevel en dit gewenste onderhoudsniveau?",
          "Hoe vergrijst dit hout en hoe ziet mijn gevel er over vijf jaar uit?",
          "Wat is de verwachte levensduur op het zuiden versus het noorden?",
        ],
        chainChallenges: [
          "Klanten onderschatten onderhoud en oriëntatie, wat tot teleurstelling en klachten leidt",
          "Advies over vergrijzing en veroudering is nu subjectief en moeilijk te tonen",
          "Restlengtes en afvalhout uit productie worden nauwelijks hoogwaardig hergebruikt",
        ],
      },
      opportunities: [
        {
          category: "Artikeldata",
          title: "Rijke productprofielen met toepassingsadvies",
          description:
            "AI verrijkt elke houtsoort met onderhoudsklasse, verwachte levensduur per oriëntatie en verwerkingsadvies vanuit specs en kennisdocumenten.",
          example:
            "Bij thermisch essen verschijnt automatisch onderhoudsklasse, levensduurindicatie en montagerichtlijn.",
          expectedValue: "Beter geïnformeerde klanten en minder klachten door verkeerde toepassing",
          requiredData: "Houtspecificaties, duurzaamheidsklassen en verwerkingsdocumenten",
          firstTest: "Verrijk vijf populaire houtsoorten en laat een adviseur de output valideren",
          scores: { value: 7, feasibility: 8, dataNeed: 5, wow: 5 },
          priority: "Quick win",
        },
        {
          category: "Klantadvies",
          title: "Vergrijzing-visualisatie van de gevel",
          description:
            "Een beeldgenerator toont hoe een gekozen houtsoort op de gevel van de klant vergrijst na 1, 3 en 5 jaar per oriëntatie.",
          example:
            "Klant uploadt een gevelfoto en ziet een realistische simulatie van de vergrijzing per houtsoort.",
          expectedValue: "Sterk onderscheidende beleving en hogere conversie op premium hout",
          requiredData: "Referentiebeelden van veroudering per houtsoort en oriëntatie",
          firstTest: "Maak een visualisatie voor twee houtsoorten en test bij een showroomgesprek",
          scores: { value: 9, feasibility: 4, dataNeed: 8, wow: 10 },
          priority: "Strategische kans",
        },
        {
          category: "Logistiek & voorraad",
          title: "Optimale lengtemix per project",
          description:
            "AI stelt op basis van geveltekening de meest efficiënte mix van plankenlengtes samen om zaagverlies te minimaliseren.",
          example:
            "Model adviseert een combinatie van 3,6 m en 4,2 m planken die verlies op deze gevel halveert.",
          expectedValue: "Minder afval, scherpere offerte en tevreden verwerkers",
          requiredData: "Geveltekeningen, beschikbare lengtes en verwerkingsregels",
          firstTest: "Toets de lengtemix op drie recente gevelprojecten",
          scores: { value: 7, feasibility: 6, dataNeed: 6, wow: 6 },
          priority: "Strategische kans",
        },
        {
          category: "Duurzaamheid & circulariteit",
          title: "Reststromen naar nieuwe toepassingen",
          description:
            "AI ontwerpt en matcht nieuwe producten uit restlengtes — zoals gevelpanelen, tuinschermen of akoestische wanden.",
          example:
            "Restlengtes onder de 1 meter worden automatisch geclusterd tot een lijnproduct voor tuinschermen.",
          expectedValue: "Nieuwe omzet uit reststromen en een sterk circulair verhaal",
          requiredData: "Reststroomdata, afmetingen en marktvraag naar afgeleide producten",
          firstTest: "Analyseer één maand reststromen en ontwerp één afgeleid product",
          scores: { value: 8, feasibility: 4, dataNeed: 7, wow: 9 },
          priority: "Later onderzoeken",
        },
        {
          category: "Commerciële waarde",
          title: "Gevelconfigurator als nieuw verkoopkanaal",
          description:
            "Een AI-configurator vertaalt een gevelfoto en wensen naar een compleet materiaal- en onderhoudsvoorstel met prijs.",
          example:
            "Architect ontwerpt online een gevel, kiest houtsoort en detail en krijgt direct een offerte met onderhoudsplan.",
          expectedValue: "Nieuw digitaal kanaal, hogere ordergrootte en directe binding met ontwerpers",
          requiredData: "Productassortiment, prijs- en onderhoudsdata en beeldherkenning van gevels",
          firstTest: "Bouw een klikbare demo voor één geveltype en test met drie architecten",
          scores: { value: 9, feasibility: 3, dataNeed: 8, wow: 10 },
          priority: "Strategische kans",
        },
      ],
    },
  },
];
