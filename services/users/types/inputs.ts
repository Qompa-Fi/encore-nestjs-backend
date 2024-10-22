import type { DocumentType } from "./user";

export type CreateUserInputs = {
  acceptTermsAndPrivacyPolicy: boolean;
  document?: {
    type: DocumentType;
    number: string;
  };
};

export type UpdateUserInputs = Partial<CreateUserInputs>;
