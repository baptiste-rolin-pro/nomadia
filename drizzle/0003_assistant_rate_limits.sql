CREATE TABLE "assistant_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "assistant_rate_limits_expires" ON "assistant_rate_limits" USING btree ("expires_at");