import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import applicationContext from "../applicationContext";
import {
  validateListBankAccountMovementsPayload,
  validateListBankAccountsPayload,
  validateSelectClientPayload,
  validateGetClientsPayload,
  validateLoginPayload,
  validateLogoutPayload,
} from "./validators/prometeo-api";
import type {
  ListInstitutionsForTransfersResponse,
  QueryBankAccountMovementsResponse,
  PreprocessTransferResponse,
  ListBankAccountsResponse,
  ConfirmTransferResponse,
  ListProvidersResponse,
  ConfirmTransferParams,
  SelectClientResponse,
  ListClientsResponse,
  LogoutResponse,
  LoginResponse,
} from "./types/response";
import type {
  QueryBankAccountMovementsParams,
  ListInstitutionsForTransfersParams,
  PreprocessTransferParams,
  ListBankAccountsParams,
  SelectClientParams,
  ListClientsParams,
  LogoutParams,
  LoginParams,
} from "./types/request";
import { ServiceError } from "./service-errors";

// Login to the specified provider using the Prometeo API.
export const login = api<LoginParams>(
  { expose: false },
  async (payload): Promise<LoginResponse> => {
    log.debug(
      `'${payload.username}' is logging in to Prometeo API using provider '${payload.provider}'...`,
    );

    const { prometeoService } = await applicationContext;

    log.debug("retrieving list of available providers to validate the payload");

    const providers = await prometeoService.getProviders();
    const providerNames = providers.map((s) => s.name);

    log.debug("validating payload...");

    const apiError = validateLoginPayload(payload, providerNames);
    if (apiError) throw apiError;

    log.debug("payload is valid, logging in...");

    const result = await prometeoService.login(payload);

    if (result.session.key.length !== 32) {
      log.warn(
        "generated Prometeo API session key is not 32 characters long, some anomalies may occur!",
      );
    }

    return result;
  },
);

// Exits the session specified in the headers.
export const logout = api<LogoutParams>(
  { expose: false },
  async (payload): Promise<LogoutResponse> => {
    const apiError = validateLogoutPayload(payload);
    if (apiError) throw apiError;

    const { prometeoService } = await applicationContext;

    const { success } = await prometeoService.logout(payload.key);

    return { success };
  },
);

// Endpoint to query movements of a user account in a given currency and date range.
export const queryBankAccountMovements = api<QueryBankAccountMovementsParams>(
  {
    expose: false,
  },
  async (payload): Promise<QueryBankAccountMovementsResponse> => {
    log.debug(
      `retrieving movements from bank account ${payload.account_number}(${payload.currency}) from ${payload.start_date} to ${payload.end_date}...`,
    );

    const apiError = validateListBankAccountMovementsPayload(payload);
    if (apiError) throw apiError;

    const { prometeoService } = await applicationContext;

    const data = await prometeoService.listBankAccountMovements(payload);

    log.debug(`returning ${data.length} user account movements...`);

    return { data };
  },
);

// List all the providers that the Prometeo API supports.
export const listProviders = api(
  { expose: false },
  async (): Promise<ListProvidersResponse> => {
    const { prometeoService } = await applicationContext;

    log.debug("retrieving providers...");

    const data = await prometeoService.getProviders();

    log.debug(`${data.length} providers retrieved`);

    return { data };
  },
);

// List all the clients that the current user has access to. Those clients changes
// depending on the previously specified provider at endpoint to login.
export const listClients = api<ListClientsParams>(
  { expose: false },
  async (payload): Promise<ListClientsResponse> => {
    const { prometeoService } = await applicationContext;

    const apiError = validateGetClientsPayload(payload);
    if (apiError) throw apiError;

    const data = await prometeoService.getClients(payload);

    return { data };
  },
);

// List all the accounts that the specified session key has access to.
// Those accounts will vary depending on the specified provider and/or client.
export const listBankAccounts = api<ListBankAccountsParams>(
  { expose: false },
  async (payload): Promise<ListBankAccountsResponse> => {
    const apiError = validateListBankAccountsPayload(payload);
    if (apiError) throw apiError;

    const { prometeoService } = await applicationContext;

    const data = await prometeoService.listBankAccounts(payload.key);

    return { data };
  },
);

// Endpoint to specify the client to use for the current session if the
// provider requires it after login.
//
// If the key requires to specify a client, it will keep in standby for
// some minutes until the client is selected.
export const selectClient = api<SelectClientParams>(
  {
    expose: false,
  },
  async (payload): Promise<SelectClientResponse> => {
    const { prometeoService } = await applicationContext;

    const clients = await prometeoService.getClients({ key: payload.key });
    if (clients.length === 0) {
      log.error("no clients found from Prometeo API! returning HTTP 500");
      throw ServiceError.somethingWentWrong;
    }

    log.debug(`${clients.length} clients found from Prometeo API...`);

    const validClients = clients.map((c) => c.id);

    const apiError = validateSelectClientPayload(payload, validClients);
    if (apiError) {
      log.debug("request failed due to validation error...");
      throw apiError;
    }

    const result = await prometeoService.selectClient(
      payload.key,
      payload.client,
    );

    return result;
  },
);

// A requirement to start a transfer is to specify the destination institution. So here
// you can claim the list of institutions that the current Prometeo session can use.
//
// This Prometeo API endpoint is implemented based on their API reference:
// https://docs.prometeoapi.com/reference/gettransferdestinations
export const listInstitutionsForTransfers =
  api<ListInstitutionsForTransfersParams>(
    { expose: false },
    async (payload): Promise<ListInstitutionsForTransfersResponse> => {
      const { prometeoService } = await applicationContext;

      try {
        const institutions = await prometeoService.listInstitutionsForTransfers(
          {
            key: payload.key,
          },
        );

        return {
          data: institutions,
        };
      } catch (error) {
        if (error instanceof APIError) throw error;

        log.error(error, "unhandled error listing institutions for transfers");

        throw ServiceError.somethingWentWrong;
      }
    },
  );

export const preprocessTransfer = api<PreprocessTransferParams>(
  {
    expose: false,
  },
  async (payload): Promise<PreprocessTransferResponse> => {
    try {
      const { prometeoService } = await applicationContext;

      const request = await prometeoService.preprocessTransfer(payload);

      return {
        request,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "unhandled error preprocessing transfer");
      throw ServiceError.somethingWentWrong;
    }
  },
);

export const confirmTransfer = api<ConfirmTransferParams>(
  { expose: false },
  async (payload): Promise<ConfirmTransferResponse> => {
    try {
      const { prometeoService } = await applicationContext;

      const result = await prometeoService.confirmTransfer(payload);

      return {
        result,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "unhandled error confirming transfer");
      throw ServiceError.somethingWentWrong;
    }
  },
);
