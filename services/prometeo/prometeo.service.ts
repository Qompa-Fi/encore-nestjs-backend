import { Injectable } from "@nestjs/common";
import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { Redis } from "ioredis";

import type { IListProvidersItemDto } from "./dtos/list-providers-item.dto";
import { ServiceError } from "./service-errors";
import type {
  UserBankAccount,
  UserBankAccountMovement,
} from "./types/user-account";
import type { LoginResponse } from "./types/response";
import type {
  PrometeoAPISuccessfulListBankAccountsResponse,
  PrometeoAPIListBankAccountsResponse,
  PrometeoAPIGetClientsErrorResponse,
  PrometeoAPIErrorLoginResponse,
  PrometeoAPIGetClientsResponse,
  PrometeoAPIGetClientsPayload,
  PrometeoAPILoginRequestBody,
  PrometeoAPILogoutResponse,
  PrometeoAPILoginResponse,
  PrometeoAPISelectClientResponse,
  PrometeoAPIListBankAccountMovementsPayload,
  PrometeoAPIListBankAccountMovementsResponse,
} from "./types/prometeo-api";
import type { Provider } from "./types/provider";
import type { Client } from "./types/client";
import { sleep } from "@/lib/thread";

/**
 * Maybe I'd like to remember why I'm doing this!
 * Because...
 *
 * - We want control over the data that is going in and out
 * - We don't want our API key to be exposed
 * - We want to link the streaming data to the user's account
 * - To cache the data in order to make costs lower
 * - Improve it to be more fault tolerant
 * - Validate the payload before sending it to Prometeo
 * - Rate limit the requests
 * - Make the API more easy to use :))))))))
 */

const prometeoApiUrl = secret("PrometeoApiUrl");
const prometeoApiKey = secret("PrometeoApiKey");
const redisUsername = secret("RedisUsername");
const redisPassword = secret("RedisPassword");
const redisPort = secret("RedisPort");
const redisHost = secret("RedisHost");

interface PrometeoRequestConfig {
  maxBackoff: number;
  maxAttempts: number;
}

const defaultConfig: PrometeoRequestConfig = {
  maxBackoff: 3000,
  maxAttempts: 5,
};

@Injectable()
export class PrometeoService {
  cache: Redis;

  constructor() {
    this.cache = new Redis({
      username: redisUsername(),
      password: redisPassword(),
      host: redisHost(),
      port: Number.parseInt(redisPort()),
    });
  }

  /**
   * @description This is a helper function that returns a RequestInit object ready to be used against the Prometeo API.
   */
  private getPrometeoRequestInit(
    method: string,
    payload?: {
      additionalHeaders?: HeadersInit;
      body?: BodyInit;
    },
  ): RequestInit {
    const { additionalHeaders, body } = payload || {};

    return {
      method,
      headers: {
        Accept: "application/json",
        "X-API-Key": prometeoApiKey(),
        ...additionalHeaders,
      },
      body,
    };
  }

  private async doFaulTolerantRequest<T>(
    enrichedPath: string,
    requestInit: RequestInit,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<T> {
    const { maxBackoff, maxAttempts } = { ...defaultConfig, ...config };

    const faultTolerantRequest = async (
      retries = 0,
      backoff = 100,
    ): Promise<T> => {
      const url = `${prometeoApiUrl()}${enrichedPath}`;

      const response = await fetch(url, requestInit);

      if (!response.ok) {
        if (retries >= maxAttempts) {
          log.error(`request failed after ${retries} attempts`);

          throw ServiceError.deadlineExceeded;
        }

        const { status } = response;

        if (status === 502) {
          log.warn(
            `request failed with status ${status}, trying again in ${backoff}ms... (${retries} retries)`,
          );

          await sleep(backoff);

          const nextBackoff = Math.min(backoff * 2, maxBackoff);

          return await faultTolerantRequest(retries + 1, nextBackoff);
        }

        const text = await response.text();

        throw new Error(`request failed with status code ${status}: ${text}`);
      }

      const data = (await response.json()) as T;

      return data;
    };

    return await faultTolerantRequest();
  }

  private async doGetProvidersList(): Promise<{
    status: string;
    providers: IListProvidersItemDto[];
  }> {
    const response = await fetch(
      `${prometeoApiUrl()}/provider/`,
      this.getPrometeoRequestInit("GET"),
    );

    const data = await response.json();

    return data as { status: string; providers: IListProvidersItemDto[] };
  }

  private async doGetProviderDetails(code: string): Promise<{
    status: string;
    provider: Provider;
  }> {
    const response = await fetch(
      `${prometeoApiUrl()}/provider/${code}/`,
      this.getPrometeoRequestInit("GET"),
    );

    if (!response.ok) {
      const text = await response.text();
      const { status } = response;

      throw new Error(
        `request to Prometeo API failed with status '${status}': ${text}`,
      );
    }

    const data = await response.json();

    return data as { status: string; provider: Provider };
  }

  private async doGetDetailedProviders(
    countryCode = "PE",
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<Provider[]> {
    const { providers } = await this.doGetProvidersList();

    const { maxBackoff, maxAttempts } = { ...defaultConfig, ...config };

    const getProviderDetails = async (
      code: string,
      attempt = 0,
      backoff = 100,
    ): Promise<Provider> => {
      try {
        const { provider } = await this.doGetProviderDetails(code);

        if (attempt !== 0) {
          log.debug(
            `successfully got provider details from Prometeo API after ${attempt} attempts (provider code: ${code})`,
          );
        }

        return provider;
      } catch (error) {
        if (attempt >= maxAttempts) {
          throw error;
        }

        log.warn(
          error,
          "error getting provider details from providers from Prometeo API",
        );
        log.debug(
          `trying to get provider details again in ${backoff}ms (provider code: ${code})`,
        );

        await sleep(backoff);

        const nextBackoff = Math.min(backoff * 2, maxBackoff);

        return await getProviderDetails(code, attempt + 1, nextBackoff);
      }
    };

    const results = await Promise.allSettled(
      providers
        .filter((p) => {
          const isSpecifiedCountry = p.country === countryCode;
          const isCorp = p.code.includes("corp") || p.code.includes("smes");

          return isSpecifiedCountry && isCorp;
        })
        .map(async (p) => await getProviderDetails(p.code)),
    );

    const filteredResults = results.filter((result) => {
      if (result.status === "rejected") {
        log.error(
          "error getting provider details from Prometeo API",
          result.reason,
        );
      }

      return result.status === "fulfilled";
    });

    return filteredResults.map((result) => result.value);
  }

  async getProviders(
    countryCode = "PE",
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<Provider[]> {
    const key = "prometeo-providers";

    const result = await this.cache.get(key);
    if (result) {
      return JSON.parse(result) as Provider[];
    }

    const providers = await this.doGetDetailedProviders(countryCode, config);

    try {
      const value = JSON.stringify(providers);
      await this.cache.setex(key, 60 * 60 * 12, value);
    } catch (error) {
      log.warn(error, "error caching Prometeo providers in kv database");
    }

    return providers;
  }

  private async doLogin(
    payload: PrometeoAPILoginRequestBody,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPILoginResponse> {
    const params = new URLSearchParams({
      provider: payload.provider,
      username: payload.username,
      password: payload.password,
    });

    if (payload.type) params.append("type", payload.type);
    if (payload.otp) params.append("otp", payload.otp);

    return await this.doFaulTolerantRequest<PrometeoAPILoginResponse>(
      "/login/",
      this.getPrometeoRequestInit("POST", {
        additionalHeaders: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }),
      config,
    );
  }

  async login(
    payload: PrometeoAPILoginRequestBody,
    config?: PrometeoRequestConfig,
  ): Promise<LoginResponse> {
    const result = await this.doLogin(payload, config);

    if (result.status === "wrong_credentials") {
      throw ServiceError.wrongCredentials;
    }

    if (result.status === "error") {
      if (result.message === "Unauthorized provider") {
        throw ServiceError.unauthorizedProvider;
      }
      log.warn("unknown API error, we can't return a correct diagnostic");
      throw ServiceError.somethingWentWrong;
    }

    if (result.status === "logged_in") {
      return {
        session: {
          key: result.key,
          requires: "nothing",
        },
      };
    }

    if (result.status === "select_client") {
      const clients = await this.getClients({ key: result.key });

      return {
        session: {
          key: result.key,
          requires: "specify_client",
        },
        clients,
      };
    }

    if (result.status === "interaction_required") {
      if (result.field === "otp") {
        return {
          session: {
            key: result.key,
            requires: "otp_code",
          },
        };
      }

      if (result.field === "personal_questions") {
        throw APIError.unimplemented(
          "you need to answer a personal question to continue but is not supported yet",
        );
      }
    }

    log.error("something is off with the Prometeo API .:", result);
    log.error("cannot complete log-in process...");

    throw ServiceError.somethingWentWrong;
  }

  async logout(key: string): Promise<{
    success: boolean;
  }> {
    const queryParams = new URLSearchParams({ key });
    const url = `${prometeoApiUrl()}/logout/?${queryParams}`;

    const response = await fetch(url, this.getPrometeoRequestInit("GET"));

    if (!response.ok) {
      const text = await response.text();
      const { status } = response;

      log.error(`logout failed with status code '${status}': ${text}`);
      log.warn(
        "[resilience] maybe we should implement a retry mechanism here...",
      );

      throw ServiceError.somethingWentWrong;
    }

    const data = (await response.json()) as PrometeoAPILogoutResponse;

    return {
      success: data.status === "logged_out",
    };
  }

  private async doListBankAccounts(
    key: string,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPISuccessfulListBankAccountsResponse> {
    const params = new URLSearchParams({ key });

    const result =
      await this.doFaulTolerantRequest<PrometeoAPIListBankAccountsResponse>(
        `/account/?${params}`,
        this.getPrometeoRequestInit("GET"),
        config,
      );

    // ! check if the status is "success" as well

    if (result.status === "error") {
      if (result.message === "Invalid key") {
        throw ServiceError.sessionKeyInvalidOrExpired;
      }

      log.error(`Prometeo API error: ${result}`);

      throw ServiceError.somethingWentWrong;
    }

    return result;
  }

  async listBankAccounts(key: string): Promise<UserBankAccount[]> {
    try {
      const { accounts } = await this.doListBankAccounts(key);

      return accounts;
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "error listing user accounts");

      throw ServiceError.somethingWentWrong;
    }
  }

  private async doGetClients(
    { key }: PrometeoAPIGetClientsPayload,
    config?: PrometeoRequestConfig,
  ): Promise<PrometeoAPIGetClientsResponse> {
    const params = new URLSearchParams({ key });

    return await this.doFaulTolerantRequest<PrometeoAPIGetClientsResponse>(
      `/client/?${params}`,
      this.getPrometeoRequestInit("GET"),
      config,
    );
  }

  async getClients(
    payload: PrometeoAPIGetClientsPayload,
    config?: PrometeoRequestConfig,
  ): Promise<Client[]> {
    let result: PrometeoAPIGetClientsResponse;

    try {
      result = await this.doGetClients(payload, config);
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "[internal] error getting clients");

      throw ServiceError.somethingWentWrong;
    }

    if (result.status === "error") {
      if (
        result.message === "Missing API key" ||
        result.message === "Key not Found"
      ) {
        log.error(
          "Prometeo API key is missing or invalid! Modify it in Encore's Dashboard!",
        );

        log.warn("Prometeo API's response was...", result);

        throw ServiceError.somethingWentWrong;
      }

      if (result.message === "Invalid key") {
        throw ServiceError.sessionKeyInvalidOrExpired;
      }

      return [];
    }

    result.clients = {
      "FIC-02412222": "FIDEICOMISO CONSORCIO PUENTES FC",
      "FIC-02501212": "FIDEICOMISO PEÑAROL",
      "FIC-00021244": "FIDEICOMISO CARE TEST",
    };

    const results: Array<Client> = [];

    for (const id in result.clients) {
      const name = result.clients[id];

      results.push({ id, name });
    }

    return results;
  }

  async doSelectClient(
    key: string,
    client: string,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPISelectClientResponse> {
    const params = new URLSearchParams({ key });

    return await this.doFaulTolerantRequest<PrometeoAPISelectClientResponse>(
      `/client/${client}/?${params}`,
      this.getPrometeoRequestInit("GET"),
      config,
    );
  }

  async selectClient(
    key: string,
    client: string,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<{ key: string }> {
    try {
      const result = await this.doSelectClient(key, client, config);
      if (result.status === "success") {
        return {
          // If the request returns a new key that is passed, otherwise
          // the same key used to perform the request is returned.
          key: result.key ?? key,
        };
      }

      if (result.message === "Invalid key") {
        throw ServiceError.sessionKeyInvalidOrExpired;
      }

      if (result.message === "wrong_client") {
        throw APIError.notFound(`specified client '${client}' does not exist`);
      }

      log.error("something is off with the Prometeo API .:", result);

      throw ServiceError.somethingWentWrong;
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "[internal] error selecting client");

      throw ServiceError.somethingWentWrong;
    }
  }

  async doListBankAccountMovements(
    payload: PrometeoAPIListBankAccountMovementsPayload,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPIListBankAccountMovementsResponse> {
    const params = new URLSearchParams({
      key: payload.key,
      currency: payload.currency,
      date_start: payload.date_start,
      date_end: payload.date_end,
    });

    return await this.doFaulTolerantRequest<PrometeoAPIListBankAccountMovementsResponse>(
      `/account/${payload.account}/movement/?${params}`,
      this.getPrometeoRequestInit("GET"),
      config,
    );
  }

  async listBankAccountMovements(
    payload: PrometeoAPIListBankAccountMovementsPayload,
    config?: PrometeoRequestConfig,
  ): Promise<UserBankAccountMovement[]> {
    try {
      const result = await this.doListBankAccountMovements(payload, config);
      if (result.status === "error") {
        if (result.message === "Invalid key") {
          throw ServiceError.sessionKeyInvalidOrExpired;
        }

        log.error("error listing user accounts but cannot be handled");
        log.error(`response body was... ${JSON.stringify(result)}`);

        throw ServiceError.somethingWentWrong;
      }

      return result.movements;
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "[internal] error listing user accounts");

      throw ServiceError.somethingWentWrong;
    }
  }
}
