import type { APIError } from "encore.dev/api";

import type { CreateUserInputs, UpdateUserInputs } from "../types/inputs";
import { ServiceError } from "../service-errors";
import { isValidDoc } from "./document-type";

export const validateCreateUserInputs = (
  inputs: CreateUserInputs,
): APIError | null => {
  const apiError = validateUpdateUserInputs(inputs);
  if (apiError) return apiError;

  return null;
};

export const validateUpdateUserInputs = (
  inputs: UpdateUserInputs,
): APIError | null => {
  const { document } = inputs;

  if (document) {
    if (!isValidDoc(document.type, document.number)) {
      return ServiceError.invalidDocument;
    }
  }

  return null;
};
