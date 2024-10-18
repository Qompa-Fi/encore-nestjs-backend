import { APIError } from "encore.dev/api";

  export const createOrganizationFirst = APIError.aborted(
    "you should create your organization first",
  ).withDetails({ "x-error": "missing_organization" });

  export const somethingWentWrong = APIError.internal("something went wrong");
}
