CREATE TABLE "job_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" "stage" NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_stage_history" ADD CONSTRAINT "job_stage_history_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_stage_history_job_idx" ON "job_stage_history" USING btree ("job_id","changed_at");--> statement-breakpoint
INSERT INTO "job_stage_history" ("job_id", "stage", "changed_at")
SELECT "id", "stage", "created_at" FROM "jobs";