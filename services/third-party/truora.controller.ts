import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";

import type { NewTruoraIdentityVerificationResponse } from "./types/response";
import type { AuthenticatedUser } from "../auth/interfaces/clerk.interface";
import { QOMPA_INTERNAL_USER_ID_KEY } from "../auth/auth";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";

const mustGetUserIdFromPublicMetadata = (
  authenticatedUser: AuthenticatedUser,
): number => {
  const userId = authenticatedUser.metadata.publicMetadata[
    QOMPA_INTERNAL_USER_ID_KEY
  ] as number | undefined;
  if (!userId) {
    throw APIError.notFound("you should create your user first");
  }

  return userId;
};

// Every registered user must succeed the Truora's identity verification so ensure
// to claim a key in this endpoint and use it in "https://identity.truora.com".
export const newTruoraIdentityVerification = api(
  {
    expose: true,
    method: "POST",
    path: "/third-party/truora/new-identity-verification",
    auth: true,
  },
  async (): Promise<NewTruoraIdentityVerificationResponse> => {
    const user = getAuthData();
    if (!user) throw ServiceError.somethingWentWrong;

    const userId = mustGetUserIdFromPublicMetadata(user);

    const { truoraService } = await applicationContext;

    const emails =
      user.metadata.emailAddresses.length > 0
        ? user.metadata.emailAddresses.map((em) => em.emailAddress)
        : undefined;

    // const phones =
    //   user.metadata.phoneNumbers.length > 0
    //     ? user.metadata.phoneNumbers.map((ph) => ph.phoneNumber)
    //     : undefined;

    const { api_key } = await truoraService.createApiKey({
      key_type: "sdk",
      key_name: "qompa-flow",
      country: "PE",
      grant: "digital-identity",
      flow_id: "IPFe2cb9113707a664e446fe3fb9e52b631",
      redirect_url: "https://qompa.io",
      account_id: userId.toString(),
      emails,
      // phones,
    });

    return { key: api_key };
  },
);
