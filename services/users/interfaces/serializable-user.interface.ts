import type { DocumentType } from "../types/user";

export interface SerializableUser {
  id: number;
  clerk_id: string;
  onboarded_at?: string;
  document: {
    type: DocumentType;
    number: string;
  } | null;
}
