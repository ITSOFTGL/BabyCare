ALTER TABLE "payments" ADD COLUMN "invoice_number" text;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_number_unique" UNIQUE("invoice_number");