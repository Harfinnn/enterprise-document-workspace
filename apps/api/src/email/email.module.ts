
import { Module } from "@nestjs/common";
import { EmailService } from "./email.service.js";
import { EmailTemplateService } from "./email-template.service.js";

@Module({
  providers: [
    EmailService,
    EmailTemplateService,
  ],
  exports: [
    EmailService,
    EmailTemplateService,
  ],
})
export class EmailModule {}
