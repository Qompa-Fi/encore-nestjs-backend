import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const somethingWentWrong = APIError.internal("something went wrong");

  export const invalidDocument = APIError.invalidArgument(
    "invalid document",
  ).withDetails({ "x-error": "invalid_document" });

  export const internalUserNotFound = APIError.notFound(
    "internal user not found",
  ).withDetails({ "x-error": "iuser_not_found" });

  export const userAlreadyExists = APIError.alreadyExists(
    "user already exists",
  ).withDetails({
    "x-error": "user_already_exists",
  });
}
