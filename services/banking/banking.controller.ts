import { prometeo } from "~encore/clients";
import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import type { ISetupProviderAccessInputDto } from "./dtos/setup-provider.dto";
import type { Provider } from "@/services/prometeo/types/provider";
import { mayGetInternalUserIdFromAuthData } from "@/lib/clerk";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import type {
  ListConfiguredProviderAccessResponse,
  ListDirectoryAccountsResponse,
  SetupProviderAccessResponse,
} from "./types/response";

/**
 * We mainly need two things:
 * - Bank account number (would vary depending on the bank)
 * - Banking credentials (will vary depending on the bank)
 *
 * Only the final digits of the account number, the alias and the provider should
 * be exposed to the user.
 *
 * We need a mechanism to notify the users about the status of their account linking.
 *
 * So if the case above happens, some services might be inactive until the user re-issues its accounts.
 */

export const submitDirectory = api(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory",
    auth: true,
  },
  async (
    payload: ISetupProviderAccessInputDto,
  ): Promise<SetupProviderAccessResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    log.debug(
      `received request to setup a provider from user with clerk id '${userId}'...`,
    );

    const { bankingService } = await applicationContext;

    const result = await bankingService.setupPrometeoProviderAccess(
      userId,
      payload,
    );

    return {
      directory: {
        id: result.id,
        provider_name: result.providerName,
      },
    };
  },
);

export const listDirectory = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory",
    auth: true,
  },
  async (): Promise<ListConfiguredProviderAccessResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    const results = await bankingService.listConfiguredProviderAccess(userId);

    return {
      data: results.map((r) => ({ id: r.id, provider_name: r.providerName })),
    };
  },
);

export const listCatalog = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/catalog",
    auth: true,
  },
  async (): Promise<{
    data: Provider[];
  }> => {
    const response: { data: Provider[] } = await prometeo.listProviders();

    return response;
  },
);

export const listDirectoryAccounts = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/accounts",
    auth: true,
  },
  async (payload: { id: number }): Promise<ListDirectoryAccountsResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    try {
      const accounts = await bankingService.listDirectoryAccounts(
        userId,
        payload.id,
      );

      return {
        data: accounts,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "unhandled error while listing directory accounts");
      throw ServiceError.somethingWentWrong;
    }
  },
);
