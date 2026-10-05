CREATE TABLE "tournament_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"admin_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "created_by_admin_id" integer;--> statement-breakpoint
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tournament_admins_pair" ON "tournament_admins" USING btree ("tournament_id","admin_id");