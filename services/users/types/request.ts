import type { DocumentType } from "./user";

export interface CreateUserParams {
  accepts_terms_and_conditions?: boolean;
}

export interface UpdateUserParams {
  accepts_terms_and_conditions?: boolean;
  document?: {
    type: DocumentType;
    number: string;
  };
}

export interface ExistsByIDParams {
  id: number;
}
