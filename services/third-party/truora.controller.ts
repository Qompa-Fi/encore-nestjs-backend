import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";

import type {
  GetTruoraProcessResultResponse,
  NewTruoraIdentityVerificationResponse,
} from "./types/response";
import type {
  GetTruoraProcessResultParams,
  NewTruoraIdentityVerificationParams,
} from "./types/request";
import {
  mayGetInternalUserIdFromAuthData,
  mustGetUserIdFromPublicMetadata,
} from "@/lib/clerk";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";

export const getTruoraProcessResult = api<
  GetTruoraProcessResultParams,
  GetTruoraProcessResultResponse
>(
  {
    expose: true,
    method: "GET",
    path: "/third-party/truora/process-result/:process_id",
    auth: true,
  },
  async (payload) => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) {
      throw ServiceError.somethingWentWrong;
    }

    const { truoraService } = await applicationContext;

    const { result } = await truoraService.getProcessResult(payload.process_id);

    if (result.account_id !== userId.toString()) {
      throw APIError.aborted(
        "you are not authorized to access this process result",
      );
    }

    return {
      process_result: {
        declined_reason: result.declined_reason,
        process_id: result.process_id,
        status: result.status,
      },
    };
  },
);

// Every registered user must succeed the Truora's identity verification so ensure
// to claim a key in this endpoint and use it in "https://identity.truora.com".
export const newTruoraIdentityVerification = api<
  NewTruoraIdentityVerificationParams,
  NewTruoraIdentityVerificationResponse
>(
  {
    expose: true,
    method: "POST",
    path: "/third-party/truora/new-identity-verification",
    auth: true,
  },
  async ({ platform }) => {
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
      key_type: platform === "mobile" ? "sdk" : "web",
      key_name: "qompa-flow",
      country: "ALL",
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
