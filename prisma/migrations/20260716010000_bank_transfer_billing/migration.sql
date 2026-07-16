-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "pendingPlan" "SubscriptionPlan";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "invoices"("stripeInvoiceId");

