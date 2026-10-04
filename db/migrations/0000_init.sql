CREATE TYPE "public"."game_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'CONFIRMED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."rotation_mode" AS ENUM('RANDOM', 'SWISS');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('PENDING', 'LIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('SETUP', 'LIVE', 'FINISHED');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"password_hash" text NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"player_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email"),
	CONSTRAINT "admins_player_id_unique" UNIQUE("player_id")
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"entry_a_id" integer NOT NULL,
	"entry_b_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"number" integer NOT NULL,
	"a1" integer NOT NULL,
	"a2" integer NOT NULL,
	"b1" integer NOT NULL,
	"b2" integer NOT NULL,
	"score_a" integer,
	"score_b" integer,
	"status" "game_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"submitted_by" integer,
	"confirmed_by" integer,
	"entered_by_admin" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp,
	"confirmed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"number" integer NOT NULL,
	"time_slot" text,
	"is_swiss" boolean DEFAULT false NOT NULL,
	"status" "round_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"event_date" timestamp,
	"status" "tournament_status" DEFAULT 'SETUP' NOT NULL,
	"games_count" integer DEFAULT 5 NOT NULL,
	"rotation_mode" "rotation_mode" DEFAULT 'RANDOM' NOT NULL,
	"random_rounds_first" integer DEFAULT 2 NOT NULL,
	"teams_enabled" boolean DEFAULT false NOT NULL,
	"team_min_size" integer DEFAULT 6 NOT NULL,
	"team_max_size" integer DEFAULT 10 NOT NULL,
	"logo" "bytea",
	"logo_mime_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_entry_a_id_entries_id_fk" FOREIGN KEY ("entry_a_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_entry_b_id_entries_id_fk" FOREIGN KEY ("entry_b_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_a1_entries_id_fk" FOREIGN KEY ("a1") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_a2_entries_id_fk" FOREIGN KEY ("a2") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_b1_entries_id_fk" FOREIGN KEY ("b1") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_b2_entries_id_fk" FOREIGN KEY ("b2") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_submitted_by_entries_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_tables" ADD CONSTRAINT "game_tables_confirmed_by_entries_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entries_tournament_player" ON "entries" USING btree ("tournament_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exclusions_pair" ON "exclusions" USING btree ("tournament_id","entry_a_id","entry_b_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tables_round_number" ON "game_tables" USING btree ("round_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "rounds_tournament_number" ON "rounds" USING btree ("tournament_id","number");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_tournament_name" ON "teams" USING btree ("tournament_id","name");