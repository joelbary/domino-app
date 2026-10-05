CREATE TABLE "general_rules" (
	"id" integer PRIMARY KEY NOT NULL,
	"text" text,
	"file" "bytea",
	"file_type" text,
	"file_name" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "rules_text" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "rules_file" "bytea";--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "rules_file_type" text;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "rules_file_name" text;