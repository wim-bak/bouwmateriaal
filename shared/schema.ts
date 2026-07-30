import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const leads = sqliteTable("leads", {
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
  createdAt: text("createdAt").default(sql`(datetime('now'))`),
});

export const materialQueries = sqliteTable("material_queries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  material: text("material").notNull(),
  organization: text("organization"),
  challenge: text("challenge"),
  ambition: text("ambition"),
  createdAt: text("createdAt").default(sql`(datetime('now'))`),
});

export const alertState = sqliteTable("alert_state", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  day: text("day").notNull(),
  kind: text("kind").notNull(),
  level: text("level").notNull(),
  sentAt: text("sentAt").default(sql`(datetime('now'))`),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialQuerySchema = createInsertSchema(materialQueries).omit({
  id: true,
  createdAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertMaterialQuery = z.infer<typeof insertMaterialQuerySchema>;
export type MaterialQuery = typeof materialQueries.$inferSelect;
