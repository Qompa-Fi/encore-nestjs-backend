import { prometeo } from "~encore/clients";
import { api } from "encore.dev/api";
import log from "encore.dev/log";

import type { ISetupProviderAccessInputDto } from "./dtos/setup-provider.dto";
import type { Provider } from "@/services/prometeo/types/provider";
import { mayGetInternalUserIdFromAuthData } from "@/lib/clerk";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import type {
  ListConfiguredProviderAccessResponse,
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

export const setupProviderAccess = api(
  {
    expose: true,
    method: "POST",
    path: "/banking/providers/:prometeo_provider/setup-access",
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
      issued_access: {
        id: result.id,
        provider_name: result.providerName,
      },
    };
  },
);

export const listConfiguredProviderAccess = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/providers/configured",
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

export const listProviders = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/providers",
    auth: true,
  },
  async (): Promise<{
    data: Provider[];
  }> => {
    const response: { data: Provider[] } = await prometeo.listProviders();

    return response;
  },
);
