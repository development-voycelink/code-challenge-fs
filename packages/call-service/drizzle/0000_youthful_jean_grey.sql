CREATE TYPE "public"."call_status" AS ENUM('waiting', 'active', 'on_hold', 'ended');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('voice', 'video');--> statement-breakpoint
CREATE TABLE "call_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"call_id" varchar(36) NOT NULL,
	"type" varchar(50) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "calls" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"type" "call_type" NOT NULL,
	"status" "call_status" NOT NULL,
	"queue_id" varchar(100) NOT NULL,
	"start_time" timestamp with time zone DEFAULT now() NOT NULL,
	"end_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_id_calls_id_fk" FOREIGN KEY ("call_id") REFERENCES "public"."calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_call_events_call_id" ON "call_events" USING btree ("call_id");--> statement-breakpoint
CREATE INDEX "idx_calls_status" ON "calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_calls_queue_id" ON "calls" USING btree ("queue_id");