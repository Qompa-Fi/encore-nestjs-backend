import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import type { CreateUserParams, ExistsByIDParams } from "./types/request";
import type {
  CreateUserResponse,
  ExistsByIDResponse,
  GetUserResponse,
} from "./types/response";
import applicationContext from "@/services/applicationContext";
import { toSerializableUser } from "./helpers/serializable";
import { mustGetAuthData } from "@/lib/clerk";

export const getUser = api<void, GetUserResponse>(
  { expose: true, method: "GET", path: "/user", auth: true },
  async () => {
    const { usersService } = await applicationContext;
    const authenticatedUser = mustGetAuthData();

    const user = await usersService.findByClerkId(authenticatedUser.userID);
    if (!user) {
      throw APIError.notFound("user not found");
    }

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

    const alreadyExists = await usersService.existsByClerkId(
      authenticatedUser.userID,
    );
    if (alreadyExists) {
      throw APIError.alreadyExists("user already exists");
    }

    log.debug(
      `user identified with clerk id '${clerkId}' does not exist, creating...`,
    );

    const user = await usersService.create(clerkId, {
      acceptTermsAndPrivacyPolicy: payload.acceptTermsAndPrivacyPolicy,
    });

    return { user: toSerializableUser(user) };
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
