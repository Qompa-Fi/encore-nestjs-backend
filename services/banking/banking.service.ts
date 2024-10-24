import { Injectable, type OnModuleInit } from "@nestjs/common";
import { prometeo as prometeoMic, users as usersMic } from "~encore/clients";
import { PrismaClient } from "@prisma/client";
import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import Redis from "ioredis";

import { validateSetupDirectoryInputs } from "./validators/request";
import type { BankingDirectoryWithoutCredentials } from "./types/banking-directory";
import type { PrometeoAPILoginParams } from "../prometeo/types/prometeo-api";
import type { SubmitDirectoryParams } from "./types/request";
import type { PrometeoCredentials } from "./types/prometeo-credentials";
import type {
  UserBankAccount,
  UserBankAccountMovement,
} from "../prometeo/types/user-account";
import type { PreprocessTranferDto } from "./dtos/preprocess-transfer.dto";
import type { BankingInstitution } from "../prometeo/types/institution";
import type { TransferRequest } from "../prometeo/types/transference";
import type { LoginResponse } from "../prometeo/types/response";
import type { Provider } from "../prometeo/types/provider";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";

const CACHED_PROMETEO_SESSION_KEY_LIFESPAN = 60 * 10; // 10m

const prometeoSessionEncryptionKey = secret("PrometeoSessionEncryptionKey");
const credentialsEncryptionKey = secret("BankingCredentialsEncryptionKey");
const redisUsername = secret("RedisUsername");
const redisPassword = secret("RedisPassword");
const redisPort = secret("RedisPort");
const redisHost = secret("RedisHost");

@Injectable()
export class BankingService extends PrismaClient implements OnModuleInit {
  cache: Redis;

  constructor() {
    super();

    this.cache = new Redis({
      username: redisUsername(),
      password: redisPassword(),
      host: redisHost(),
      port: Number.parseInt(redisPort()),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  private async getPrometeoProviders(): Promise<Provider[]> {
    const providersResponse = await prometeoMic.listProviders();
    const providers = providersResponse.data;

    if (providers.length === 0) {
      log.error("no providers could be retrieved from Prometeo service");
      log.error("full response was...", providersResponse);

      throw ServiceError.somethingWentWrong;
    }

    return providers;
  }

  private async userExistsById(userId: number): Promise<boolean> {
    try {
      const userExistsResponse: { userExists: boolean } =
        await usersMic.existsById({ id: userId });

      return userExistsResponse.userExists;
    } catch (error) {
      log.error(
        `[microservice call error] could not check if user '${userId}' exists`,
        error,
      );

      throw ServiceError.somethingWentWrong;
    }
  }

  async renameDirectory(
    userId: number,
    directoryId: number,
    newName: string | null,
  ): Promise<BankingDirectoryWithoutCredentials> {
    if (newName) {
      if (newName.length < 4) {
        throw ServiceError.nameMustBeMoreThan4Chars;
      }

      if (newName.length > 90) {
        throw ServiceError.nameMustBeLessEqThan90Chars;
      }
    }

    return await this.bankingDirectory.update({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        providerName: true,
      },
      where: {
        userId,
        id: directoryId,
      },
      data: {
        name: newName,
      },
    });
  }

  async submitDirectory(
    userId: number,
    inputs: SubmitDirectoryParams,
  ): Promise<BankingDirectoryWithoutCredentials> {
    const providers = await this.getPrometeoProviders();

    if (inputs.name) {
      if (inputs.name.length < 4) {
        throw ServiceError.nameMustBeMoreThan4Chars;
      }

      if (inputs.name.length > 90) {
        throw ServiceError.nameMustBeLessEqThan90Chars;
      }
    }

    if (inputs.prometeo_provider === "test") {
      log.warn("using test provider...");
    } else {
      const selectedProvider = providers.find(
        (p) => p.name === inputs.prometeo_provider,
      );
      if (!selectedProvider) {
        throw APIError.invalidArgument(
          `no provider found with name '${inputs.prometeo_provider}'`,
        );
      }

      const { name, bank } = selectedProvider;

      log.debug(
        `specified provider is '${name}' - ${bank.name} [${bank.code}]...`,
      );

      const apiError = validateSetupDirectoryInputs(inputs, selectedProvider);
      if (apiError) throw apiError;
    }

    const userExists = await this.userExistsById(userId);
    if (!userExists) {
      log.error(`user with id "${userId}" does not exist, aborting...`);

      throw ServiceError.issuerNotFound;
    }

    try {
      const result = await this.savePrometeoProviderCredentials({
        name: inputs.name,
        providerName: inputs.prometeo_provider,
        credentials: inputs.credentials,
        userId,
      });

      return result;
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error("error while saving provider credentials", error);

      throw ServiceError.somethingWentWrong;
    }
  }

  private async decryptProviderCredentials(
    encryptedCredentials: string,
  ): Promise<PrometeoCredentials> {
    const { securityService } = await applicationContext;

    const rawJsonCredentials = securityService.decryptAES256(
      encryptedCredentials,
      credentialsEncryptionKey(),
    );

    const result = JSON.parse(rawJsonCredentials) as PrometeoCredentials;
    if (!result.username || !result.password) {
      log.warn("encrypted credentials are not valid, aborting...");

      throw ServiceError.somethingWentWrong;
    }

    return result;
  }

  private async encryptProviderCredentials(
    credentials: PrometeoCredentials,
  ): Promise<string> {
    const jsonEncodedCredentials = JSON.stringify(credentials);

    const { securityService } = await applicationContext;

    return securityService.encryptAES256(
      jsonEncodedCredentials,
      credentialsEncryptionKey(),
    );
  }

  private async savePrometeoProviderCredentials(inputs: {
    name?: string;
    providerName: string;
    credentials: PrometeoCredentials;
    userId: number;
  }): Promise<BankingDirectoryWithoutCredentials> {
    let encryptedCredentials: string;

    try {
      encryptedCredentials = await this.encryptProviderCredentials(
        inputs.credentials,
      );
    } catch (error) {
      log.error("error while encrypting provider credentials", error);

      throw ServiceError.somethingWentWrong;
    }

    try {
      const result = await this.bankingDirectory.create({
        select: {
          id: true,
          name: true,
          providerName: true,
          createdAt: true,
          updatedAt: true,
        },
        data: {
          name: inputs.name,
          providerName: inputs.providerName,
          userId: inputs.userId,
          encryptedCredentials,
        },
      });

      return {
        id: result.id,
        name: result.name,
        providerName: result.providerName,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };
    } catch (error) {
      log.error("error while saving provider credentials", error);

      throw ServiceError.somethingWentWrong;
    }
  }

  async listDirectories(
    userId: number,
  ): Promise<BankingDirectoryWithoutCredentials[]> {
    const results = await this.bankingDirectory.findMany({
      select: {
        id: true,
        name: true,
        providerName: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        userId: userId,
      },
    });

    return results;
  }

  async deleteDirectory(
    userId: number,
    directoryId: number,
  ): Promise<{ id: number }> {
    const count = await this.bankingDirectory.count({
      where: {
        id: directoryId,
        userId,
      },
    });

    if (count === 0) {
      throw ServiceError.directoryNotFound;
    }

    return await this.bankingDirectory.delete({
      where: {
        userId,
        id: directoryId,
      },
    });
  }

  async getUserDirectoryCount(userId: number): Promise<number> {
    return await this.bankingDirectory.count({
      where: {
        userId: userId,
      },
    });
  }

  private async getCachedPrometeoLogin(
    userId: number,
    bankingDirectoryId: number,
  ): Promise<string | null> {
    const key = `u:${userId}::bd:${bankingDirectoryId}`;

    try {
      let cipheredValue: string | null;

      try {
        // I don't expect that a 'nil' value throws an error
        cipheredValue = await this.cache.get(key);
      } catch (error) {
        log.warn(
          `error while getting cached prometeo session key (key: ${key}), cause: ${error}`,
        );
        return null;
      }

      if (!cipheredValue) return null;

      const { securityService } = await applicationContext;
      const secretKey = prometeoSessionEncryptionKey();

      return securityService.decryptAES256(cipheredValue, secretKey);
    } catch (error) {
      log.error(
        `unexpected error while decrypting prometeo session key, cause: ${error}`,
      );
      log.warn(
        "'null' value will be returned but the error may indicate that something's off somewhere...",
      );

      return null;
    }
  }

  private async storePrometeoLogin(
    userId: number,
    bankingDirectoryId: number,
    prometeoSessionKey: string,
  ): Promise<void> {
    const key = `u:${userId}::bd:${bankingDirectoryId}`;

    const { securityService } = await applicationContext;
    const secretKey = prometeoSessionEncryptionKey();

    let cipheredValue: string;

    try {
      cipheredValue = securityService.encryptAES256(
        prometeoSessionKey,
        secretKey,
      );
    } catch (error) {
      log.error(
        `unexpected error while encrypting prometeo session key, cause: ${error}`,
      );
      log.warn(
        "maybe the encryption key is invalid or the secret key is not set correctly...? this won't be spared",
      );

      throw ServiceError.somethingWentWrong;
    }

    try {
      await this.cache.setex(
        key,
        CACHED_PROMETEO_SESSION_KEY_LIFESPAN,
        cipheredValue,
      );
    } catch (error) {
      log.error(
        `unexpected error while trying to save prometeo session key in cache, cause: ${error}`,
      );
    }
  }

  private async doLoginToPrometeoAPI(
    userId: number,
    bankingDirectoryId: number,
  ): Promise<string> {
    const storedSessionKey = await this.getCachedPrometeoLogin(
      userId,
      bankingDirectoryId,
    );
    if (storedSessionKey) return storedSessionKey;

    const result = await this.bankingDirectory.findFirst({
      select: {
        encryptedCredentials: true,
        providerName: true,
      },
      where: {
        id: bankingDirectoryId,
        userId,
      },
    });
    if (!result) throw ServiceError.directoryNotFound;

    const { providerName, encryptedCredentials } = result;

    const credentials =
      await this.decryptProviderCredentials(encryptedCredentials);

    const loginPayload: PrometeoAPILoginParams = {
      username: credentials.username,
      password: credentials.password,
      provider: providerName,
    };

    if (credentials.type && credentials.document_number) {
      loginPayload.type = credentials.type;
      loginPayload.document_number = credentials.document_number;
    }

    const { session }: LoginResponse = await prometeoMic.login(loginPayload);

    if (session.requires !== "nothing") {
      return ""; // unreachable for now
    }

    await this.storePrometeoLogin(userId, bankingDirectoryId, session.key);

    return session.key;
  }

  async listDirectoryAccounts(
    userId: number,
    bankingDirectoryId: number,
    prometeoSessionKey?: string,
  ): Promise<UserBankAccount[]> {
    let sessionKey = prometeoSessionKey;

    if (!sessionKey) {
      sessionKey = await this.doLoginToPrometeoAPI(userId, bankingDirectoryId);
    }

    const response = await prometeoMic.listBankAccounts({
      key: sessionKey,
    });

    return response.data;
  }

  async queryDirectoryAccountMovements(
    userId: number,
    directoryId: number,
    accountNumber: string,
    filters: {
      currency: string;
      start_date: string;
      end_date: string;
    },
    prometeoSessionKey?: string,
  ): Promise<UserBankAccountMovement[]> {
    let sessionKey = prometeoSessionKey;

    if (!sessionKey) {
      log.trace(
        "login in to Prometeo API since no session key was specified...",
      );

      sessionKey = await this.doLoginToPrometeoAPI(userId, directoryId);

      log.trace(`Prometeo API's session key is truthy? ${!!sessionKey}`);
    }

    const response = await prometeoMic.queryBankAccountMovements({
      key: sessionKey,
      account_number: accountNumber,
      ...filters,
    });

    return response.data;
  }

  async listInstitutionsForTransfers(
    userId: number,
    bankingDirectoryId: number,
    prometeoSessionKey?: string,
  ): Promise<BankingInstitution[]> {
    let sessionKey = prometeoSessionKey;

    if (!sessionKey) {
      sessionKey = await this.doLoginToPrometeoAPI(userId, bankingDirectoryId);
    }

    const response = await prometeoMic.listInstitutionsForTransfers({
      key: sessionKey,
    });

    return response.data;
  }

  async requestTransfer(
    userId: number,
    bankingDirectoryId: number,
    payload: PreprocessTranferDto,
    prometeoSessionKey?: string,
  ): Promise<TransferRequest> {
    let sessionKey = prometeoSessionKey;

    if (!sessionKey) {
      log.trace("session key is not provided, doing login...");
      sessionKey = await this.doLoginToPrometeoAPI(userId, bankingDirectoryId);
      log.trace("successfully logged in Prometeo API");
    }

    const response = await prometeoMic.preprocessTransfer({
      key: sessionKey,
      ...payload,
    });

    log.debug("preprocess transfer response was...", response);

    return response.request;
  }

  async confirmTransfer(
    userId: number,
    bankingDirectoryId: number,
    payload: {
      request_id: string;
      authorization_type: string;
      authorization_data: string;
      authorization_device_number?: string;
    },
    prometeoSessionKey?: string,
  ): Promise<{
    message: string;
    success: boolean;
  }> {
    let sessionKey = prometeoSessionKey;

    if (!sessionKey) {
      log.trace("session key is not provided, doing login...");
      sessionKey = await this.doLoginToPrometeoAPI(userId, bankingDirectoryId);
      log.trace("successfully logged in Prometeo API");
    }

    const response = await prometeoMic.confirmTransfer({
      ...payload,
      key: sessionKey,
    });

    return response.result;
  }
}
