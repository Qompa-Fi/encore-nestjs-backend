import type { DocumentType } from "./user";

export type CreateUserInputs = {
  acceptsTyC: boolean;
  document?: {
    type: DocumentType;
    number: string;
  };
};

export type UpdateUserInputs = Partial<CreateUserInputs>;
