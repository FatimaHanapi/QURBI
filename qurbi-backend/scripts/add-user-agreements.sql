-- QURBI user agreement onboarding fields (MySQL 8+).
-- Existing users remain valid: all new fields are nullable until accepted.

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `privacyPolicyAcceptedAt` DATETIME(6) NULL,
  ADD COLUMN IF NOT EXISTS `userAgreementAcceptedAt` DATETIME(6) NULL,
  ADD COLUMN IF NOT EXISTS `adultConfirmedAt` DATETIME(6) NULL,
  ADD COLUMN IF NOT EXISTS `agreementsVersion` VARCHAR(40) NULL;
