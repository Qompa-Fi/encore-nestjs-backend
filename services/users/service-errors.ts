import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const somethingWentWrong = APIError.internal("something went wrong");

  export const invalidDocument = APIError.invalidArgument(
    "invalid document",
  ).withDetails({ "x-error": "invalid_document" });
}
