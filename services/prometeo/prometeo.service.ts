import { Injectable } from "@nestjs/common";
import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { Redis } from "ioredis";

import type { IListSuppliersItemDto } from "./dtos/list-suppliers-item.dto";
import type { UserBankAccount } from "./types/user-account";
import type {
  PrometeoAPISuccessfulListUserAccountsResponse,
  PrometeoAPIListUserAccountsResponse,
  PrometeoAPISuccessfulLoginResponse,
  PrometeoAPILoginRequestBody,
  PrometeoAPILogoutResponse,
  PrometeoAPILoginResponse,
} from "./types/prometeo-api";
import type { Supplier } from "./types/supplier";
import { sleep } from "@/lib/thread";

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

  private async getProvidersList(): Promise<{
    status: string;
    providers: IListSuppliersItemDto[];
  }> {
    const response = await fetch(`${prometeoApiUrl()}/provider/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": prometeoApiKey(),
      },
    });

    const data = await response.json();

    return data as { status: string; providers: IListSuppliersItemDto[] };
  }

  private async getProviderDetails(code: string): Promise<{
    status: string;
    provider: Supplier;
  }> {
    const response = await fetch(`${prometeoApiUrl()}/provider/${code}/`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": prometeoApiKey(),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      const { status } = response;

      throw new Error(
        `request to Prometeo API failed with status '${status}': ${text}`,
      );
    }

    const data = await response.json();

    return data as { status: string; provider: Supplier };
  }

  private async getDetailedProviders(
    countryCode = "PE",
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<Supplier[]> {
    const { providers } = await this.getProvidersList();

    const { maxBackoff, maxAttempts } = { ...defaultConfig, ...config };

    const getProviderDetails = async (
      code: string,
      attempt = 0,
      backoff = 100,
    ): Promise<Supplier> => {
      try {
        const { provider } = await this.getProviderDetails(code);

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

  async getSuppliers(
    countryCode = "PE",
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<Supplier[]> {
    const key = "prometeo-suppliers";

    const result = await this.cache.get(key);
    if (result) {
      return JSON.parse(result) as Supplier[];
    }

    const suppliers = await this.getDetailedProviders(countryCode, config);

    try {
      const value = JSON.stringify(suppliers);
      await this.cache.setex(key, 60 * 60 * 12, value);
    } catch (error) {
      log.warn(error, "error caching Prometeo suppliers in kv database");
    }

    return suppliers;
  }

  async login(
    payload: PrometeoAPILoginRequestBody,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPISuccessfulLoginResponse> {
    const { maxBackoff, maxAttempts } = { ...defaultConfig, ...config };

    const faultTolerantLogin = async (
      retries = 0,
      backoff = 100,
    ): Promise<PrometeoAPILoginResponse> => {
      if (retries > 0) {
        log.warn(`trying to login again in... (${retries} retries)`);
      }

      const bodyParams = new URLSearchParams();
      bodyParams.append("provider", payload.provider);
      bodyParams.append("username", payload.username);
      bodyParams.append("password", payload.password);
      if (payload.type) bodyParams.append("type", payload.type);
      if (payload.otp) bodyParams.append("otp", payload.otp);

      const response = await fetch(`${prometeoApiUrl()}/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "X-API-Key": prometeoApiKey(),
        },
        body: bodyParams.toString(),
      });

      if (!response.ok) {
        if (retries >= maxAttempts) {
          log.error(`login failed after ${retries} attempts`);

          throw APIError.deadlineExceeded("login failed");
        }

        const { status } = response;

        if (status === 502) {
          log.warn(
            `login failed with status ${status}, trying again in ${backoff}ms... (${retries} retries)`,
          );

          await sleep(backoff);

          const nextBackoff = Math.min(backoff * 2, maxBackoff);

          return await faultTolerantLogin(retries + 1, nextBackoff);
        }

        const text = await response.text();

        if (status === 403 && text.includes("wrong_credentials")) {
          log.warn("login failed with status 403...");

          throw APIError.permissionDenied("wrong credentials");
        }

        // TODO: provide a more deep error analysis!
        // ! don't expose error
        throw new Error(`request failed with status code ${status}: ${text}`);
      }

      const data = await response.json();

      return data as PrometeoAPILoginResponse;
    };

    const result = await faultTolerantLogin();

    // it could be 2XX but we still need to check the status :)))
    if (result.status === "interaction_required") {
      // they never explain the purpose of this
      log.debug("context is...", result.context);

      throw APIError.permissionDenied("interaction required");
    }

    if (result.status === "error") {
      if (result.message.includes("unknown provider")) {
        const { provider } = payload;

        log.debug(`requester has passed an unknown provider...!: ${provider}`);

        throw APIError.invalidArgument("unknown provider");
      }

      log.error(`login failed with unexpected error: ${result}`);

      throw APIError.internal("unexpected error");
    }

    return result;
  }

  async logout(key: string): Promise<{
    success: boolean;
  }> {
    const queryParams = new URLSearchParams({ key });
    const url = `${prometeoApiUrl()}/logout/?${queryParams}`;

    const response = await fetch(url, {
      method: "GET", // weird design
      headers: { "X-API-Key": prometeoApiKey() },
    });

    if (!response.ok) {
      const text = await response.text();
      const { status } = response;

      log.error(`logout failed with status code '${status}': ${text}`);
      log.warn(
        "[resilience] maybe we should implement a retry mechanism here...",
      );

      throw APIError.internal("unexpected error");
    }

    const data = (await response.json()) as PrometeoAPILogoutResponse;

    return {
      success: data.status === "logged_out",
    };
  }

  private async fetchUserAccounts(
    key: string,
    config?: Partial<PrometeoRequestConfig>,
  ): Promise<PrometeoAPISuccessfulListUserAccountsResponse> {
    const { maxBackoff, maxAttempts } = { ...defaultConfig, ...config };

    const queryParams = new URLSearchParams({ key });
    const url = `${prometeoApiUrl()}/account/?${queryParams}`;

    const faultTolerantListUserAccounts = async (
      retries = 0,
      backoff = 100,
    ) => {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": prometeoApiKey(),
        },
      });

      if (!response.ok) {
        if (retries >= maxAttempts) {
          log.error(`login failed after ${retries} attempts`);

          throw APIError.deadlineExceeded("login failed");
        }

        const { status } = response;

        if (status === 502) {
          log.warn(
            `cannot list user accounts, trying again in... ${backoff}ms... (${retries} retries)`,
          );

          await sleep(backoff);

          const nextBackoff = Math.min(backoff * 2, maxBackoff);

          return await faultTolerantListUserAccounts(retries + 1, nextBackoff);
        }

        const text = await response.text();

        throw new Error(`request failed with status code ${status}: ${text}`);
      }

      const data = await response.json();

      return data as PrometeoAPIListUserAccountsResponse;
    };

    const result = await faultTolerantListUserAccounts();
    // ! check if the status is "success" as well

    if (result.status === "error") {
      if (result.message === "Invalid key") {
        throw APIError.permissionDenied(
          "Prometeo API key is invalid or expired",
        );
      }

      log.error(`Prometeo API error: ${result}`);

      throw APIError.internal("unexpected error");
    }

    return result;
  }

  async listUserAccounts(key: string): Promise<UserBankAccount[]> {
    try {
      const { accounts } = await this.fetchUserAccounts(key);

      return accounts;
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(error, "error listing user accounts");

      throw APIError.unavailable("cannot list user accounts");
    }
  }
}
