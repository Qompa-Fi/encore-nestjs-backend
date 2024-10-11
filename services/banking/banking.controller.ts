import { prometeo } from "~encore/clients";
import { api, APIError, type Query } from "encore.dev/api";
import log from "encore.dev/log";

import type { PrometeoAPIConfirmTransferRequestBody } from "../prometeo/types/prometeo-api";
import type { ISetupProviderAccessInputDto } from "./dtos/setup-provider.dto";
import type { UserBankAccountMovement } from "../prometeo/types/user-account";
import type { BankingInstitution } from "../prometeo/types/institution";
import type { Provider } from "@/services/prometeo/types/provider";
import { mayGetInternalUserIdFromAuthData } from "@/lib/clerk";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import type {
  ListConfiguredProviderAccessResponse,
  ListDirectoryAccountsResponse,
  SetupProviderAccessResponse,
} from "./types/response";
import type {
  PreprocessTranferResponse,
  PreprocessTranferDto,
} from "./dtos/preprocess-transfer.dto";

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
        name: result.name,
        provider_name: result.providerName,
        created_at: result.createdAt,
        updated_at: result.updatedAt,
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
      data: results.map((r) => ({
        id: r.id,
        name: r.name ?? null,
        provider_name: r.providerName,
        created_at: r.createdAt.toISOString(),
        updated_at: r.updatedAt?.toISOString() ?? null,
      })),
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

export const queryDirectoryAccountMovements = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/accounts/:account_number/movements",
    auth: true,
  },
  async (payload: {
    id: number;
    account_number: string;
    currency: Query<string>;
    start_date: Query<string>;
    end_date: Query<string>;
  }): Promise<{
    data: UserBankAccountMovement[];
  }> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    log.debug(
      `user '${userId}' wants to query its bank accounts, payload: ${payload}`,
    );

    const { bankingService } = await applicationContext;

    try {
      log.debug("querying movements...");

      const movements = await bankingService.queryDirectoryAccountMovements(
        userId,
        payload.id,
        payload.account_number,
        {
          currency: payload.currency,
          start_date: payload.start_date,
          end_date: payload.end_date,
        },
      );

      log.debug(
        `${movements.length} movements were retrieved from specified account`,
      );

      return {
        data: movements,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "unhandled error while querying movements");

      throw ServiceError.somethingWentWrong;
    }
  },
);

export const listInstitutionsForTransfers = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/institutions",
    auth: true,
  },
  async (payload: { id: number }): Promise<{
    data: BankingInstitution[];
  }> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    const directoryId = payload.id;

    const results = await bankingService.listInstitutionsForTransfers(
      userId,
      directoryId,
    );

    return {
      data: results,
    };
  },
);

export const requestTransfer = api(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory/:id/request-transfer",
    auth: true,
  },
  async (
    payload: {
      id: number;
    } & PreprocessTranferDto,
  ): Promise<PreprocessTranferResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    const directoryId = payload.id;

    log.debug("directory ID is...", directoryId);

    const request = await bankingService.preprocessTransfer(
      userId,
      directoryId,
      {
        concept: payload.concept,
        branch: payload.branch,
        currency: payload.currency,
        amount: payload.amount,
        origin_account: payload.origin_account,
        destination_account: payload.destination_account,
        destination_institution: payload.destination_institution,
        destination_owner_name: payload.destination_owner_name,
        destination_account_type: payload.destination_account_type,
      },
    );

    return {
      request,
    };
  },
);

export const confirmTransfer = api(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory/:id/confirm-transfer",
    auth: true,
  },
  async (payload: {
    id: number;
    request_id: string;
    authorization_type: string;
    authorization_data: string;
    authorization_device_number?: string;
  }): Promise<{
    result: {
      message: string;
      success: boolean;
    };
  }> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    const directoryId = payload.id;

    const result = await bankingService.confirmTransfer(
      userId,
      directoryId,
      payload,
    );

    return {
      result,
    };
  },
);
