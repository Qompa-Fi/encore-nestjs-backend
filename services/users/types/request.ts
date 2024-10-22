import type { DocumentType } from "./user";

export interface CreateUserParams {
  accept_terms_and_privacy_policy: boolean;
}

export interface UpdateUserParams {
  accept_terms_and_privacy_policy?: boolean;
  document?: {
    type: DocumentType;
    number: string;
  };
}

export interface ExistsByIDParams {
  id: number;
}
