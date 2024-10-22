import { type User as UserModel, PrismaClient } from "@prisma/client";
import { type ClerkClient, createClerkClient } from "@clerk/backend";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { secret } from "encore.dev/config";

import type { CreateUserInputs, UpdateUserInputs } from "./types/inputs";
import {
  validateCreateUserInputs,
  validateUpdateUserInputs,
} from "./validators/inputs";
import { ServiceError } from "./service-errors";
import log from "encore.dev/log";

const clerkPublishableKey = secret("ClerkPublishableKey");
const clerkSecretKey = secret("ClerkSecretKey");

@Injectable()
export class UsersService extends PrismaClient implements OnModuleInit {
  clerkClient: ClerkClient;

  constructor() {
    super();

    this.clerkClient = createClerkClient({
      publishableKey: clerkPublishableKey(),
      secretKey: clerkSecretKey(),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async create(
    clerkUserId: string,
    inputs: CreateUserInputs,
  ): Promise<UserModel> {
    const apiError = validateCreateUserInputs(inputs);
    if (apiError) {
      log.debug("request payload was invalid");
      throw apiError;
    }

    // TODO: refactor in auth microservice
    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    if (!clerkUser) {
      throw ServiceError.somethingWentWrong;
    }

    const { acceptTermsAndPrivacyPolicy: _0, document, ...userData } = inputs;

    const internalUser = await this.user.create({
      data: {
        clerkId: clerkUser.id,
        documentType: document?.type,
        documentNumber: document?.number,
        ...userData,
      },
    });

    await this.clerkClient.users.updateUserMetadata(clerkUser.id, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        acceptTermsAndPrivacyPolicy: inputs.acceptTermsAndPrivacyPolicy,
        internalUserId: internalUser.id,
      },
    });

    return internalUser;
  }

  async findByClerkId(clerkId: string): Promise<UserModel | null> {
    return this.user.findUnique({
      where: { clerkId },
    });
  }

  async update(userId: number, inputs: UpdateUserInputs): Promise<UserModel> {
    const apiError = validateUpdateUserInputs(inputs);
    if (apiError) {
      log.debug("request payload was invalid");
      throw apiError;
    }

    const user = await this.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) throw ServiceError.internalUserNotFound;

    const data: Record<string, string | boolean> = {};

    if (inputs.document) {
      data.documentType = inputs.document.type;
      data.documentNumber = inputs.document.number;
    }

    // ! might get more complex with time
    if (inputs.acceptTermsAndPrivacyPolicy !== undefined) {
      const clerkUser = await this.clerkClient.users.getUser(user.clerkId);
      if (!clerkUser) {
        throw ServiceError.somethingWentWrong;
      }

      await this.clerkClient.users.updateUserMetadata(clerkUser.id, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          acceptTermsAndPrivacyPolicy: inputs.acceptTermsAndPrivacyPolicy,
        },
      });
    }

    if (Object.keys(data).length === 0) {
      throw ServiceError.noSingleFieldWasUpdated;
    }

    return await this.user.update({
      where: { id: userId },
      data,
    });
  }

  async resolveIdByClerkId(clerkId: string): Promise<number> {
    const result = await this.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!result) {
      throw new Error("User not found");
    }
    return result.id;
  }

  async existsById(userId: number): Promise<boolean> {
    return (await this.user.count({ where: { id: userId } })) > 0;
  }

  async existsByClerkId(clerkId: string): Promise<boolean> {
    return (
      (await this.user.count({
        where: { clerkId },
      })) > 0
    );
  }
}
