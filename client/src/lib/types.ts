export interface MaterialProfile {
  description: string;
  properties: string[];
  customerQuestions: string[];
  chainChallenges: string[];
}

export type Priority = "Quick win" | "Strategische kans" | "Later onderzoeken" | "Niet direct relevant";

export interface OppScores {
  value: number;
  feasibility: number;
  dataNeed: number;
  wow: number;
}

export type MarketMaturity = "Nog niet" | "In opkomst" | "Bestaat generiek" | "Volwassen markt";

export interface MarketContext {
  maturity: MarketMaturity;
  existingSolutions: string;
  gap: string;
}

export interface Opportunity {
  category: string;
  title: string;
  description: string;
  example: string;
  expectedValue: string;
  requiredData: string;
  firstTest: string;
  scores: OppScores;
  priority: Priority;
  marketContext?: MarketContext;
}

export interface KansenkaartResult {
  materialProfile: MaterialProfile;
  opportunities: Opportunity[];
}

export interface FormInputs {
  material: string;
  organization: string;
  challenge: string;
  ambition: string;
}
