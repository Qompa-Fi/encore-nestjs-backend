import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const organizationNotFound = APIError.notFound(
    "organization not found",
  );

  export const userNotFound = APIError.aborted(
    "you should create your user first",
  );

  export const somethingWentWrong = APIError.internal("something went wrong");
}
