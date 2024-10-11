import { prometeo } from "~encore/clients";
import { api, APIError, type Query } from "encore.dev/api";
import log from "encore.dev/log";

import type { Provider } from "@/services/prometeo/types/provider";
import type { ISetupDirectory } from "./dtos/setup-directory.dto";
import { mayGetInternalUserIdFromAuthData } from "@/lib/clerk";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import type {
  ListDirectoryInstitutionsResponse,
  QueryAccountMovementsResponse,
  ListDirectoryAccountsResponse,
  ConfirmTransferResponse,
  ListDirectoriesResponse,
  SetupDirectoryResponse,
} from "./types/response";
import type {
  PreprocessTranferResponse,
  PreprocessTranferDto,
} from "./dtos/preprocess-transfer.dto";

export const submitDirectory = api(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory",
    auth: true,
  },
  async (payload: ISetupDirectory): Promise<SetupDirectoryResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    log.debug(
      `received request to 'setup a directory' from user with clerk id '${userId}'...`,
    );

    const { bankingService } = await applicationContext;

    const result = await bankingService.setupDirectory(userId, payload);

    return {
      directory: {
        id: result.id,
        name: result.name,
        provider_name: result.providerName,
        created_at: result.createdAt.toISOString(),
        updated_at: result.updatedAt ? result.updatedAt.toISOString() : null,
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
  async (): Promise<ListDirectoriesResponse> => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.userNotFound;
    }

    const { bankingService } = await applicationContext;

    const results = await bankingService.listDirectories(userId);

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
  }): Promise<QueryAccountMovementsResponse> => {
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

export const listDirectoryInstitutions = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/institutions",
    auth: true,
  },
  async (payload: {
    id: number;
  }): Promise<ListDirectoryInstitutionsResponse> => {
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

    log.debug("specified directory ID is...", directoryId);

    const request = await bankingService.requestTransfer(userId, directoryId, {
      concept: payload.concept,
      branch: payload.branch,
      currency: payload.currency,
      amount: payload.amount,
      origin_account: payload.origin_account,
      destination_account: payload.destination_account,
      destination_institution: payload.destination_institution,
      destination_owner_name: payload.destination_owner_name,
      destination_account_type: payload.destination_account_type,
    });

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
  }): Promise<ConfirmTransferResponse> => {
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
