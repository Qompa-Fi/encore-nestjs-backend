import type { DocumentType } from "../types/user";

export interface SerializableUser {
  id: number;
  clerkId: string;
  onboardedAt?: string;
  document: {
    type: DocumentType;
    number: string;
  } | null;
}
