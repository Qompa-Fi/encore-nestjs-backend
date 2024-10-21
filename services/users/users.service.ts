import { type ClerkClient, createClerkClient } from "@clerk/backend";
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { secret } from "encore.dev/config";
import {
  type User as UserModel,
  type Prisma,
  PrismaClient,
} from "@prisma/client";
import { ServiceError } from "./service-errors";

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
    inputs: Prisma.UserCreateInput & {
      acceptTermsAndPrivacyPolicy: boolean;
    },
  ): Promise<UserModel> {
    // TODO: refactor in auth microservice
    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    if (!clerkUser) {
      throw ServiceError.somethingWentWrong;
    }

    const { acceptTermsAndPrivacyPolicy: _, ...userData } = inputs;

    const internalUser = await this.user.create({
      data: userData,
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

  async update(
    userId: number,
    input: Prisma.UserUpdateInput,
  ): Promise<UserModel> {
    const data: Prisma.UserUpdateInput = {};

    if (input.onboardedAt !== undefined && input.onboardedAt !== null) {
      data.onboardedAt = input.onboardedAt;
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
