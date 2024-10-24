import { getAuthData } from "~encore/auth";
import { APIError } from "encore.dev/api";

import type { AuthenticatedUser } from "@/services/auth/interfaces/clerk.interface";

export const mustGetAuthData = (): AuthenticatedUser => {
  const user = getAuthData();
  if (!user) {
    throw new Error("User not authenticated");
  }

  return user;
};

export const mustGetUserIdFromPublicMetadata = (
  authenticatedUser: AuthenticatedUser,
): number => {
  const userId = authenticatedUser.metadata.publicMetadata.internal_user_id;
  if (!userId) {
    throw APIError.notFound("you should create your user first");
  }

  return userId;
};

export const mayGetInternalUserIdFromAuthData = (): number | undefined => {
  const authenticatedUser = getAuthData();
  if (!authenticatedUser) return undefined;

  return authenticatedUser.metadata.publicMetadata.internal_user_id;
};
