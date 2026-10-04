CREATE TABLE "hands" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_table_id" integer NOT NULL,
	"hand_number" integer NOT NULL,
	"pair" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "tournament_id" integer;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "timer_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "rounds" ADD COLUMN "timer_remaining_sec" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "timer_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "round_minutes" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "results_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "mpl_owner_entry_id" integer;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_game_table_id_game_tables_id_fk" FOREIGN KEY ("game_table_id") REFERENCES "public"."game_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_slug_unique" UNIQUE("slug");