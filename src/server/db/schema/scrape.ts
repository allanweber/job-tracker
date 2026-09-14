import { pgTable, text, timestamp, uuid, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const scrapeTierEnum = pgEnum("scrape_tier", ["tier1", "tier2"]);

export const scrapeFailures = pgTable(
  "scrape_failures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    tierReached: scrapeTierEnum("tier_reached").notNull(),
    errorReason: text("error_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("scrape_failures_domain_idx").on(t.domain)],
);
