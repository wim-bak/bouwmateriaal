import { Package, MessageSquare, Truck, Leaf, TrendingUp, type LucideIcon } from "lucide-react";
import type { Priority, MarketMaturity } from "./types";

export const categoryIcons: Record<string, LucideIcon> = {
  Artikeldata: Package,
  Klantadvies: MessageSquare,
  "Logistiek & voorraad": Truck,
  "Duurzaamheid & circulariteit": Leaf,
  "Commerciële waarde": TrendingUp,
};

export function iconForCategory(category: string): LucideIcon {
  // tolerate small variations
  if (categoryIcons[category]) return categoryIcons[category];
  const c = category.toLowerCase();
  if (c.includes("artikel") || c.includes("data")) return Package;
  if (c.includes("advies") || c.includes("klant")) return MessageSquare;
  if (c.includes("logistiek") || c.includes("voorraad")) return Truck;
  if (c.includes("duurzaam") || c.includes("circul")) return Leaf;
  return TrendingUp;
}

export interface PriorityStyle {
  badge: string;
  dot: string;
}

export function priorityStyle(priority: Priority | string): PriorityStyle {
  switch (priority) {
    case "Quick win":
      return { badge: "bg-groen/15 text-groen border-groen/30", dot: "bg-groen" };
    case "Strategische kans":
      return { badge: "bg-highlight/15 text-highlight border-highlight/30", dot: "bg-highlight" };
    case "Later onderzoeken":
      return { badge: "bg-lichtblauw/15 text-lichtblauw border-lichtblauw/30", dot: "bg-lichtblauw" };
    default:
      return { badge: "bg-grijs/15 text-grijs border-grijs/30", dot: "bg-grijs" };
  }
}

export function maturityStyle(maturity: MarketMaturity | string): string {
  switch (maturity) {
    case "Nog niet":
      return "bg-groen/15 text-groen border-groen/30";
    case "In opkomst":
      return "bg-lichtblauw/15 text-lichtblauw border-lichtblauw/30";
    case "Bestaat generiek":
      return "bg-highlight/15 text-highlight border-highlight/30";
    case "Volwassen markt":
      return "bg-grijs/15 text-grijs border-grijs/30";
    default:
      return "bg-grijs/15 text-grijs border-grijs/30";
  }
}
