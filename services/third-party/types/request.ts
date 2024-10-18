export interface NewTruoraIdentityVerificationParams {
  platform: "web" | "mobile";
}

export interface GetTruoraProcessResultParams {
  process_id: string; // TODO: validate format
}
