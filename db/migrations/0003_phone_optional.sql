ALTER TABLE "players" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "phone_note" text;