import type { Prisma } from "@prisma/client";

import type { DocumentType } from "./user";

export type CreateUserInputs = Omit<
  Prisma.UserCreateInput,
  | "clerkId"
  | "documentType"
  | "documentNumber"
  | "sunatProfile"
  | "onboardedAt"
  | "bankingDirectories"
  | "organizationMembers"
> & {
  acceptTermsAndPrivacyPolicy: boolean;
  document?: {
    type: DocumentType;
    number: string;
  };
};
