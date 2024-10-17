import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const somethingWentWrong = APIError.internal("something went wrong");

  export const issuerNotFound = APIError.aborted(
    "issuer not found in the system",
  );

  export const userNotFound = APIError.aborted(
    "you should create your user first",
  );

  export const directoryNotFound = APIError.notFound(
    "specified directory was not found",
  );

  export const nameMustBeMoreThan4Chars = APIError.invalidArgument(
    "name must be more than 4 characters long",
  );

  export const nameMustBeLessEqThan90Chars = APIError.invalidArgument(
    "name must be less or equal than 90 characters long",
  );
}
