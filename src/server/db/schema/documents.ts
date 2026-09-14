import { pgTable, text, timestamp, uuid, integer, pgEnum } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const documentKindEnum = pgEnum("document_kind", [
  "resume",
  "cover_letter",
  "other",
]);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: documentKindEnum("kind").notNull().default("other"),
  filename: text("filename").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type"),
  sizeBytes: integer("size_bytes"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});
