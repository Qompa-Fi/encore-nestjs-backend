import { getAuthData } from "~encore/auth";

import type { AuthenticatedUser } from "@/services/auth/interfaces/clerk.interface";
import { QOMPA_INTERNAL_USER_ID_KEY } from "@/services/auth/auth";

export const mustGetAuthData = (): AuthenticatedUser => {
  const user = getAuthData();
  if (!user) {
    throw new Error("User not authenticated");
  }

  return user;
};

export const mayGetInternalUserIdFromAuthData = (): number | undefined => {
  const authenticatedUser = getAuthData();
  if (!authenticatedUser) return undefined;

  return authenticatedUser.metadata.publicMetadata[
    QOMPA_INTERNAL_USER_ID_KEY
  ] as number | undefined;
};
