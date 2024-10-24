import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import { mayGetInternalUserIdFromAuthData, mustGetAuthData } from "@/lib/clerk";
import type {
  CreateUserParams,
  ExistsByIDParams,
  UpdateUserParams,
} from "./types/request";
import type {
  CreateUserResponse,
  ExistsByIDResponse,
  UpdateUserResponse,
  GetUserResponse,
  CheckUserStatusResponse,
} from "./types/response";
import applicationContext from "@/services/applicationContext";
import { toSerializableUser } from "./helpers/serializable";
import { ServiceError } from "./service-errors";

export const getUser = api<void, GetUserResponse>(
  { expose: true, method: "GET", path: "/user", auth: true },
  async () => {
    const { usersService } = await applicationContext;
    const authenticatedUser = mustGetAuthData();

    const user = await usersService.findByClerkId(authenticatedUser.userID);
    if (!user) throw ServiceError.internalUserNotFound;

    return { user: toSerializableUser(user) };
  },
);

export const createUser = api<CreateUserParams, CreateUserResponse>(
  { expose: true, method: "POST", path: "/user", auth: true },
  async (payload) => {
    const { usersService } = await applicationContext;
    const authenticatedUser = mustGetAuthData();

    const clerkId = authenticatedUser.userID;

    log.debug(
      `someone identified with clerk id '${clerkId}' wants to create its own user...`,
    );

    const alreadyExists = await usersService.existsByClerkId(clerkId);
    if (alreadyExists) throw ServiceError.userAlreadyExists;

    log.debug(
      `user identified with clerk id '${clerkId}' does not exist, creating...`,
    );

    const user = await usersService.create(clerkId, {
      acceptsTyC: payload.accepts_terms_and_conditions,
    });

    return { user: toSerializableUser(user) };
  },
);

export const updateUser = api<UpdateUserParams, UpdateUserResponse>(
  { expose: true, method: "PATCH", path: "/user", auth: true },
  async (payload) => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) throw ServiceError.missingUser;

    const { usersService } = await applicationContext;

    try {
      const user = await usersService.update(userId, {
        acceptsTyC: payload.accepts_terms_and_conditions,
        document: payload.document,
      });

      return { user: toSerializableUser(user) };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(`unhandled error when trying to update user: ${error}`);
      throw ServiceError.somethingWentWrong;
    }
  },
);

export const checkUserStatus = api<void, CheckUserStatusResponse>(
  {
    expose: true,
    method: "GET",
    path: "/user/status",
    auth: true,
  },
  async () => {
    const clerkUser = mustGetAuthData();

    const internalUserId = clerkUser.metadata.publicMetadata.internal_user_id;
    if (!internalUserId) throw ServiceError.missingUser;

    const { usersService } = await applicationContext;

    try {
      const status = await usersService.getUserStatus(clerkUser);

      return { status };
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(`unhandled error when trying to get user status: ${error}`);
      throw ServiceError.somethingWentWrong;
    }
  },
);

export const existsById = api<ExistsByIDParams, ExistsByIDResponse>(
  { expose: false },
  async (payload) => {
    const { usersService } = await applicationContext;

    const userExists = await usersService.existsById(payload.id);

    return {
      userExists,
    };
  },
);
