-- Feature 6: explicit lifecycle for independently streamed answers.
CREATE TYPE "AnswerStatus" AS ENUM ('PENDING', 'STREAMING', 'COMPLETED', 'FAILED');

ALTER TABLE "Answer"
  ALTER COLUMN "content" SET DEFAULT '',
  ADD COLUMN "status" "AnswerStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "startedAt" TIMESTAMP(3),
  ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Answer_turnId_modelId_key" ON "Answer"("turnId", "modelId");
