import type { ProcessResult } from "./process";

interface TruoraUnauthorizedResponse {
  message: "Unauthorized";
}

interface TruoraErrorResponse {
  code: string;
  message: string;
}

export interface TruoraSuccessCreateApiKeyResponse {
  api_key: string;
  message: string;
}

export type TruoraErrorCreateApiKeyResponse =
  | TruoraUnauthorizedResponse
  | TruoraErrorResponse;

export interface TruoraSuccessGetProcessResultResponse {
  result: ProcessResult;
}
