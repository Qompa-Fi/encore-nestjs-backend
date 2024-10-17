export interface NewTruoraIdentityVerificationResponse {
  // The key to be used in the Truora flow.
  key: string;
}

export interface GetTruoraProcessResultResponse {
  process_result: {
    process_id: string;
    declined_reason: string; // TODO: add literals
    status: string; // TODO: add literals
  };
}
