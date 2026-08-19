CREATE TABLE "NotificationReceipt" (
  "id" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "hiddenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationReceipt_notificationId_userId_key" ON "NotificationReceipt"("notificationId", "userId");
CREATE INDEX "NotificationReceipt_userId_hiddenAt_idx" ON "NotificationReceipt"("userId", "hiddenAt");
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
