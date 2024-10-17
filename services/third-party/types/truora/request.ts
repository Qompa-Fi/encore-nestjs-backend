export interface TruoraCreateApiKeyGenericParams {
  api_key_version?: string;
  // List of emails to be validated during the identity verification process
  emails?: string[];
  // List of phone numbers to be validated during the identity verification process
  phones?: string[];
  // Billing hubs allow for separated counters and billing. Required if the customer uses billing hubs
  billing_hub?: string;
}

type TruoraCreateApiKeyParamsForGrant =
  | {
      grant: "digital-identity";
      account_id?: string;
      flow_id: string;
      country: "ALL" | "BR" | "CL" | "CO" | "CR" | "EC" | "MX" | "PE" | "AR";
      redirect_url: string;
    }
  | {
      grant: "signals";
    }
  | {
      key_type: "backend";
      grant?: "signals";
    }
  | {
      key_type: "backend";
      grant?: "digital-identity";
      account_id?: string;
      flow_id: string;
      country: "ALL" | "BR" | "CL" | "CO" | "CR" | "EC" | "MX" | "PE" | "AR";
      redirect_url: string;
    };

interface TruoraCreateApiKeyClientKeyParams {
  key_type: "sdk" | "web";
  key_name?: string;
}

interface TruoraCreateApiKeyBackendKeyParams {
  key_type: "backend";
  key_name: string;
}

type TruoraCreateApiKeyClientParams = TruoraCreateApiKeyClientKeyParams &
  TruoraCreateApiKeyParamsForGrant;

type TruoraCreateApiKeyBackendParams = TruoraCreateApiKeyBackendKeyParams &
  TruoraCreateApiKeyParamsForGrant;

export type TruoraCreateApiKeyParams = TruoraCreateApiKeyGenericParams &
  (TruoraCreateApiKeyClientParams | TruoraCreateApiKeyBackendParams);

export interface TruoraQueryProcessesParams {
  processId: string;
}
