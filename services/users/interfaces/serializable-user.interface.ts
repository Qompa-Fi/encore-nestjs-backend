import type { DocumentType } from "../types/user";

export interface SerializableUser {
  id: number;
  clerk_id: string;
  document: {
    type: DocumentType;
    number: string;
  } | null;
}
