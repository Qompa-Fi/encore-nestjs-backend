import { api, APIError, type Header } from "encore.dev/api";
import log from "encore.dev/log";

import type { IGetClientsResponse } from "./interfaces/get-clients-response.interface";
import type {
  PrometeoAPILoginRequestBody,
  PrometeoAPIPreprocessTransferRequestBody,
} from "./types/prometeo-api";
import type { BankingInstitution } from "./types/institution";
import type { TransferRequest } from "./types/transference";
import type {
  UserBankAccount,
  UserBankAccountMovement,
} from "./types/user-account";
import applicationContext from "../applicationContext";
import type { Provider } from "./types/provider";
import {
  validateListBankAccountMovementsPayload,
  validateListBankAccountsPayload,
  validateSelectClientPayload,
  validateGetClientsPayload,
  validateLoginPayload,
  validateLogoutPayload,
} from "./validators/prometeo-api";
import type { LoginResponse } from "./types/response";
import { ServiceError } from "./service-errors";

// Login to the specified provider using the Prometeo API.
export const login = api(
  { expose: false },
  async (payload: PrometeoAPILoginRequestBody): Promise<LoginResponse> => {
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
export const logout = api(
  { expose: false },
  async (payload: {
    // The session key to be passed to the Prometeo API.
    key: Header<"X-Prometeo-Session-Key">;
  }): Promise<{
    // Whether the logout was successful or not.
    success: boolean;
  }> => {
    const apiError = validateLogoutPayload(payload);
    if (apiError) throw apiError;

    const { prometeoService } = await applicationContext;

    const { success } = await prometeoService.logout(payload.key);

    return { success };
  },
);

// Endpoint to query movements of a user account in a given currency and date range.
export const queryBankAccountMovements = api(
  {
    expose: false,
  },
  async (payload: {
    // The session key to be passed to the Prometeo API.
    key: Header<"X-Prometeo-Session-Key">;
    // The account to query. See '/third-party/prometeo/accounts' to retrieve a list of accounts
    // in the current provider and/or client.
    account_number: string;
    // The currency that the account is denominated in.
    currency: string;
    // The date in 'dd/mm/yyyy' format from which to start querying movements.
    start_date: string;
    // The date in 'dd/mm/yyyy' format until which to query movements.
    end_date: string;
  }): Promise<{
    // An array containing all the movements that the specified account has made in the specified currency.
    data: UserBankAccountMovement[];
  }> => {
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
  async (): Promise<{
    // An array with all the providers that the Prometeo API supports.
    data: Provider[];
  }> => {
    const { prometeoService } = await applicationContext;

    log.debug("retrieving providers...");

    const data = await prometeoService.getProviders();

    log.debug(`${data.length} providers retrieved`);

    return { data };
  },
);

// List all the clients that the current user has access to. Those clients changes
// depending on the previously specified provider at endpoint to login.
export const listClients = api(
  { expose: false },
  async (payload: {
    // The session key to be passed to the Prometeo API.
    key: Header<"X-Prometeo-Session-Key">;
  }): Promise<IGetClientsResponse> => {
    const { prometeoService } = await applicationContext;

    const apiError = validateGetClientsPayload(payload);
    if (apiError) throw apiError;

    const data = await prometeoService.getClients(payload);

    return { data };
  },
);

// List all the accounts that the specified session key has access to.
// Those accounts will vary depending on the specified provider and/or client.
export const listBankAccounts = api(
  { expose: false },
  async (payload: {
    // The session key to be passed to the Prometeo API.
    key: Header<"X-Prometeo-Session-Key">;
  }): Promise<{
    // An array containing all the accounts that the specified session key has access to.
    data: UserBankAccount[];
  }> => {
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
export const selectClient = api(
  {
    expose: false,
  },
  async (payload: {
    // The session key to be passed to the Prometeo API. This is
    // a key that is supposed to be waiting for this operation.
    key: Header<"X-Prometeo-Session-Key">;
    // The ID of the client to use for the current session.
    client: string;
  }): Promise<{
    // The session key to be passed to the Prometeo API. This key
    // might change in certain providers so the previous is invalidated.
    key: string;
  }> => {
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
export const listInstitutionsForTransfers = api(
  { expose: false },
  async (payload: {
    // The session key to be passed to the Prometeo API.
    key: Header<"X-Prometeo-Session-Key">;
  }): Promise<{
    // An array(originally destinations) containing all the institutions that the specified session key has access to.
    data: BankingInstitution[];
  }> => {
    const { prometeoService } = await applicationContext;

    try {
      const institutions = await prometeoService.listInstitutionsForTransfers({
        key: payload.key,
      });

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

export const preprocessTransfer = api(
  {
    expose: false,
  },
  async (
    payload: PrometeoAPIPreprocessTransferRequestBody,
  ): Promise<{
    request: TransferRequest;
  }> => {
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
