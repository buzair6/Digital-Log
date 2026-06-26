-- AlterTable
ALTER TABLE "ChecklistNode" ADD COLUMN "scoreMap" TEXT;
ALTER TABLE "ChecklistNode" ADD COLUMN "visibleWhen" TEXT;
ALTER TABLE "ChecklistNode" ADD COLUMN "weight" REAL;

-- AlterTable
ALTER TABLE "ChecklistResponse" ADD COLUMN "capturedAt" DATETIME;
ALTER TABLE "ChecklistResponse" ADD COLUMN "fileName" TEXT;
ALTER TABLE "ChecklistResponse" ADD COLUMN "geoLat" REAL;
ALTER TABLE "ChecklistResponse" ADD COLUMN "geoLng" REAL;

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "dueDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "completedAt" DATETIME,
    "evidenceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CorrectiveAction_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "ChecklistInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CorrectiveAction_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CorrectiveAction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChecklistInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "assignedToUserId" TEXT,
    "routedToGroupId" TEXT,
    "createdById" TEXT NOT NULL,
    "startedAt" DATETIME,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "reviewComments" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "assetId" TEXT,
    "score" REAL,
    "maxScore" REAL,
    "passed" BOOLEAN,
    "flaggedCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChecklistInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistInstance_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChecklistInstance_routedToGroupId_fkey" FOREIGN KEY ("routedToGroupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChecklistInstance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChecklistInstance_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChecklistInstance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChecklistInstance" ("assetId", "assignedToUserId", "createdAt", "createdById", "id", "reviewComments", "reviewedAt", "reviewedById", "routedToGroupId", "startedAt", "status", "submittedAt", "templateId", "updatedAt") SELECT "assetId", "assignedToUserId", "createdAt", "createdById", "id", "reviewComments", "reviewedAt", "reviewedById", "routedToGroupId", "startedAt", "status", "submittedAt", "templateId", "updatedAt" FROM "ChecklistInstance";
DROP TABLE "ChecklistInstance";
ALTER TABLE "new_ChecklistInstance" RENAME TO "ChecklistInstance";
CREATE INDEX "ChecklistInstance_status_idx" ON "ChecklistInstance"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CorrectiveAction_status_idx" ON "CorrectiveAction"("status");
