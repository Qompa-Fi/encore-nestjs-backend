import type { APIError } from "encore.dev/api";

import type { CreateUserInputs } from "../types/inputs";
import type { DocumentType } from "../types/user";
import {
  isValidImmigrationCard,
  isValidPassport,
  isValidDNI,
} from "./document-type";
import { ServiceError } from "../service-errors";

const isValidDoc = (type: DocumentType, number: string): boolean => {
  if (type === "dni") {
    return isValidDNI(number);
  }

  if (type === "immigration_card") {
    return isValidImmigrationCard(number);
  }

  if (type === "passport") {
    return isValidPassport(number);
  }

  return false;
};

export const validateCreateUserInputs = (
  inputs: CreateUserInputs,
): APIError | null => {
  const { document } = inputs;

  if (document) {
    if (isValidDoc(document.type, document.number)) {
      return ServiceError.invalidDocument;
    }
  }

  return null;
};
