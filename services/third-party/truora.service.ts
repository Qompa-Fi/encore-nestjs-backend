import { Injectable } from "@nestjs/common";
import { secret } from "encore.dev/config";

import type { TruoraCreateApiKeyParams } from "./types/truora/request";
import type { ProcessResult } from "./types/truora/process";
import type {
  TruoraSuccessCreateApiKeyResponse,
  TruoraSuccessGetProcessResultResponse,
} from "./types/truora/response";

const truoraApiKey = secret("TruoraAPIKey");

@Injectable()
export class TruoraService {
  async getProcessResult(
    truoraProcessId: string,
  ): Promise<TruoraSuccessGetProcessResultResponse> {
    const response = await fetch(
      `https://api.identity.truora.com/v1/processes/${truoraProcessId}/result`,
      {
        headers: {
          "Truora-API-Key": truoraApiKey(),
          Accept: "application/json",
        },
      },
    );

    const result = (await response.json()) as ProcessResult;

    return {
      result,
    };
  }

  async createApiKey(
    payload: TruoraCreateApiKeyParams,
  ): Promise<TruoraSuccessCreateApiKeyResponse> {
    const params = new URLSearchParams();

    params.append("key_type", payload.key_type);
    if (payload.key_name) params.append("key_name", payload.key_name);

    if (payload.api_key_version) {
      params.append("api_key_version", payload.api_key_version);
    }

    if (payload.emails) params.append("emails", payload.emails.join(","));
    if (payload.phones) params.append("phones", payload.phones.join(","));
    if (payload.billing_hub) params.append("billing_hub", payload.billing_hub);

    if (payload.grant) {
      params.append("grant", payload.grant);

      if (payload.grant === "digital-identity") {
        if (payload.account_id) params.append("account_id", payload.account_id);

        params.append("flow_id", payload.flow_id);
        params.append("country", payload.country);
        params.append("redirect_url", payload.redirect_url);
      }
    }

    console.log("params", params);

    const response = await fetch("https://api.account.truora.com/v1/api-keys", {
      method: "POST",
      headers: {
        "Truora-API-Key": truoraApiKey(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
      redirect: "follow",
    });

    if (!response.ok) {
      const result = await response.text();

      throw new Error(`failed to create new api key, response: ${result}`);
    }
    const data = await response.json();

    return data as TruoraSuccessCreateApiKeyResponse;
  }
}
