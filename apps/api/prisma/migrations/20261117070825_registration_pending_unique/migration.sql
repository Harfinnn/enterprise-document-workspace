CREATE UNIQUE INDEX "RegistrationRequest_pending_email_unique"
ON "RegistrationRequest" (LOWER("email"))
WHERE "status" = 'PENDING';

CREATE UNIQUE INDEX "RegistrationRequest_pending_employeeNo_unique"
ON "RegistrationRequest" ("employeeNo")
WHERE "status" = 'PENDING'
AND "employeeNo" IS NOT NULL;