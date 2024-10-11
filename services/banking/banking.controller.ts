import { prometeo } from "~encore/clients";
import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import type { Provider } from "@/services/prometeo/types/provider";
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
  ListCatalogResponse,
} from "./types/response";
import type {
  QueryDirectoryAccountMovementsParams,
  ListDirectoryInstitutionsParams,
  ListDirectoryAccountsParams,
  ConfirmTransferParams,
  RequestTransferParams,
  SetupDirectoryParams,
} from "./types/request";
import type { PreprocessTranferResponse } from "./dtos/preprocess-transfer.dto";

// This service allows to configure a directory with credentials to allow
// Prometeo API to log-in to read and mutate the user's bank accounts.
export const submitDirectory = api<SetupDirectoryParams>(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory",
    auth: true,
  },
  async (payload): Promise<SetupDirectoryResponse> => {
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

// List of directories that the user have issued before.
//
// If a client wants to gather banking data then it should start with this endpoint
//  by first selecting a directory and then subsequently performing operations like
// querying accounts, account movements, performing transfers, etc.
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

// List of Prometeo API providers that can be used when issuing a new directory.
export const listCatalog = api(
  {
    expose: true,
    method: "GET",
    path: "/banking/catalog",
    auth: true,
  },
  async (): Promise<ListCatalogResponse> => {
    const response: { data: Provider[] } = await prometeo.listProviders();

    return response;
  },
);

// List of accounts that belongs to the specified directory. Between the returned
// data there is relevant information like the the currency, number and balance for
// the corresponding account.
//
// Normally the account ID and number will be partially censored but still the ID
// should be used for subsequent API calls when trying to transfer money, query bank
// account movements and so on.
export const listDirectoryAccounts = api<ListDirectoryAccountsParams>(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/accounts",
    auth: true,
  },
  async (payload): Promise<ListDirectoryAccountsResponse> => {
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

// Returns a list of movements that happened in an account at the specified date range.
// The date values must be specified in DD/MM/YYYY format.
//
// The parameter for currency is important since it will be used to match an account
// and then list its movements.
export const queryDirectoryAccountMovements =
  api<QueryDirectoryAccountMovementsParams>(
    {
      expose: true,
      method: "GET",
      path: "/banking/directory/:id/accounts/:account_number/movements",
      auth: true,
    },
    async (payload): Promise<QueryAccountMovementsResponse> => {
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

// List of institutions that the client should use when trying to transfer money.
//
// Normally a user might need to select an institution when they want to transfer
// money using an account number or CCI.
export const listDirectoryInstitutions = api<ListDirectoryInstitutionsParams>(
  {
    expose: true,
    method: "GET",
    path: "/banking/directory/:id/institutions",
    auth: true,
  },
  async (payload): Promise<ListDirectoryInstitutionsResponse> => {
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

// Prepare a transfer request. The `request_id` field must be supplied in the next API call to
// `banking.ConfirmTransfer` to as you can infer, to confirm the transfer.
//
//
// Other use case can also be to use it confirm that the user-specified
// transaction information is correct since the user might need to perform a confirmation step.
export const requestTransfer = api<RequestTransferParams>(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory/:id/request-transfer",
    auth: true,
  },
  async (payload): Promise<PreprocessTranferResponse> => {
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

// After requesting a transfer, the user must validate its identity and confirm
// the transfer with this endpoint.
export const confirmTransfer = api<ConfirmTransferParams>(
  {
    expose: true,
    method: "POST",
    path: "/banking/directory/:id/confirm-transfer",
    auth: true,
  },
  async (payload): Promise<ConfirmTransferResponse> => {
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
