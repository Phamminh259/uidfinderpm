-- AlterTable
ALTER TABLE "PageView" ADD COLUMN     "ipHash" TEXT;

-- CreateTable
CREATE TABLE "IpRecord" (
    "ipHash" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "limitPerMinute" INTEGER,

    CONSTRAINT "IpRecord_pkey" PRIMARY KEY ("ipHash")
);

-- CreateIndex
CREATE INDEX "IpRecord_blocked_idx" ON "IpRecord"("blocked");

-- CreateIndex
CREATE INDEX "IpRecord_lastSeenAt_idx" ON "IpRecord"("lastSeenAt");

-- CreateIndex
CREATE INDEX "PageView_ipHash_createdAt_idx" ON "PageView"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "UidLookup_ipHash_createdAt_idx" ON "UidLookup"("ipHash", "createdAt");
