import { APIError } from "encore.dev/api";

export namespace ServiceError {
  export const invalidSolCredentials = APIError.invalidArgument(
    "the provided SOL credentials are invalid",
  ).withDetails({ "x-error": "invalid_credentials" });

  export const createOrganizationFirst = APIError.aborted(
    "you should create your organization first",
  ).withDetails({ "x-error": "missing_organization" });

  export const somethingWentWrong = APIError.internal("something went wrong");
}
