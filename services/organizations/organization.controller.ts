import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import {
  mayGetInternalUserIdFromAuthData,
  mustGetAuthData,
  mustGetUserIdFromPublicMetadata,
} from "@/lib/clerk";
import { toSerializableOrganization } from "./helpers/serializable";
import type {
  GetUserOrganizationResponse,
  CreateOrganizationResponse,
  GetOrganizationsResponse,
} from "./types/response";
import type {
  GetUserOrganizationParams,
  CreateOrganizationParams,
} from "./types/request";
import { checkCreateOrganizationParams } from "./validators/request";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";

export const getOrganizations = api<void, GetOrganizationsResponse>(
  { expose: true, method: "GET", path: "/organizations", auth: true },
  async () => {
    const authenticatedUser = mustGetAuthData();

    log.debug("retrieving all user organizations...");

    const { organizationsService } = await applicationContext;

    const userId = mustGetUserIdFromPublicMetadata(authenticatedUser);

    try {
      const organizations = await organizationsService.getAllForUser(userId);

      log.debug(`${organizations.length} organizations were retrieved`);

      return {
        organizations: organizations.map((organization) =>
          toSerializableOrganization(organization),
        ),
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(
        `unhandled error when trying to get user organizations: ${error}`,
      );

      throw ServiceError.somethingWentWrong;
    }
  },
);

export const createOrganization = api<
  CreateOrganizationParams,
  CreateOrganizationResponse
>(
  { expose: true, method: "POST", path: "/organizations", auth: true },
  async (payload) => {
    const authenticatedUser = mustGetAuthData();

    log.debug(
      `user identified with clerk id '${authenticatedUser.userID}' wants to create an organization, payload is... ${payload}`,
    );

    const { organizationsService } = await applicationContext;

    const rubroIds = await organizationsService.getAvailableRubroIds();

    const errorMessage = checkCreateOrganizationParams(payload, rubroIds);
    if (errorMessage) throw APIError.invalidArgument(errorMessage);

    const userId = mustGetUserIdFromPublicMetadata(authenticatedUser);

    try {
      const organization = await organizationsService.create(userId, payload);

      log.debug(`organization was created... ${organization}`);

      return {
        organization: toSerializableOrganization(organization),
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(
        `unhandled error when trying to 'create organization': ${error}`,
      );

      throw ServiceError.somethingWentWrong;
    }
  },
);

export const getUserOrganization = api<
  GetUserOrganizationParams,
  GetUserOrganizationResponse
>({ expose: false, auth: true }, async (payload) => {
  const userId = mayGetInternalUserIdFromAuthData();
  if (!userId) throw ServiceError.userNotFound;

  const { organizationsService } = await applicationContext;

  try {
    const organization = await organizationsService.findUserOrganization(
      userId,
      payload.id,
    );
    if (!organization) throw ServiceError.organizationNotFound;

    return {
      organization: toSerializableOrganization(organization),
    };
  } catch (error) {
    if (error instanceof APIError) throw error;

    log.error(`unhandled error when trying to get user organization: ${error}`);

    throw ServiceError.somethingWentWrong;
  }
});
