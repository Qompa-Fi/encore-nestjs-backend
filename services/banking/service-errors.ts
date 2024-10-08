import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const somethingWentWrong = APIError.internal("something went wrong");

  export const issuerNotFound = APIError.aborted(
    "issuer not found in the system",
  );

  export const userNotFound = APIError.aborted(
    "you should create your user first",
  );
}
