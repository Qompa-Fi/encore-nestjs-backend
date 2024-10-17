import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import type { SerializableOrganization } from "./interfaces/serializable-organization.interface";
import { mustGetAuthData, mustGetUserIdFromPublicMetadata } from "@/lib/clerk";
import { toSerializableOrganization } from "./helpers/serializable";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import {
  checkCreateOrganizationDto,
  type ICreateOrganizationDto,
} from "./dtos/create-organization.dto";

export const getOrganizations = api(
  { expose: true, method: "GET", path: "/organizations", auth: true },
  async (): Promise<{
    organizations: SerializableOrganization[];
  }> => {
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

export const createOrganization = api(
  { expose: true, method: "POST", path: "/organizations", auth: true },
  async (
    payload: ICreateOrganizationDto,
  ): Promise<{ organization: SerializableOrganization }> => {
    const authenticatedUser = mustGetAuthData();

    log.debug(
      `user identified with clerk id '${authenticatedUser.userID}' wants to create an organization, payload is... ${payload}`,
    );

    const { organizationsService } = await applicationContext;

    const rubroIds = await organizationsService.getAvailableRubroIds();

    const errorMessage = checkCreateOrganizationDto(payload, rubroIds);
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
