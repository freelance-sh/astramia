ALTER TYPE "public"."reading_topic" ADD VALUE 'compatibilidad';--> statement-breakpoint
ALTER TYPE "public"."reading_topic" ADD VALUE 'personalidad';--> statement-breakpoint
ALTER TYPE "public"."reading_topic" ADD VALUE 'camino';--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "birth_latitude" double precision;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "birth_longitude" double precision;--> statement-breakpoint
ALTER TABLE "readings" ADD COLUMN "partner" jsonb;