import type { UserBankAccount, UserBankAccountMovement } from "./user-account";
import type { BankingInstitution } from "./institution";

export interface PrometeoAPILoginRequestBody {
  // The provider to login to.
  provider: string;
  // The "access key ID" to use for the login.
  username: string;
  // The "access key secret" to use for the login.
  password: string;
  // Optional. The type of account or document (this will vary depending on the provider).
  type?: string;
  // Optional. The document number (this will vary depending on the provider and account type).
  document_number?: string;
  // Optional. The OTP code to use for the login if the provider required it in a previous call.
  otp?: string;
}

export interface PrometeoAPIGenericErrorResponse {
  status: "error";
  message: string & {};
}

export interface PrometeoAPIErrorUnathorizedProviderResponse {
  status: "error";
  message: "Unauthorized provider";
}

export interface PrometeoAPIErrorWrongCredentialsResponse {
  status: "wrong_credentials";
}

export type PrometeoAPIErrorLoginResponse =
  | PrometeoAPIErrorWrongCredentialsResponse
  | PrometeoAPIErrorUnathorizedProviderResponse
  | PrometeoAPIGenericErrorResponse;

export interface PrometeoAPIErrorInvalidKeyResponse {
  status: "error";
  message: "Invalid key";
}

export interface PrometeoAPIErrorMissingAPIKeyResponse {
  status: "error";
  message: "Missing API key";
}

export interface PrometeoAPIErrorAPIKeyNotFoundResponse {
  status: "error";
  message: "Key not Found";
}

/**
 * URL: https://banking.prometeoapi.net/login/
 *
 * Login
 * https://docs.prometeoapi.com/reference/login
 */
export interface PrometeoAPISuccessfulLoginResponse {
  status: "logged_in";
  key: string;
}

export interface PrometeoAPILoginSelectClientResponse {
  status: "select_client";
  key: string;
}

export interface PrometeoAPILoginRequiresPersonalQuestionResponse {
  status: "interaction_required";
  field: "personal_questions";
  context: string;
  key: string;
}

export interface PrometeoAPILoginRequiresOTPResponse {
  status: "interaction_required";
  field: "otp";
  context: string;
  key: string;
}

export type PrometeoAPILoginAcceptableResponse =
  | PrometeoAPISuccessfulLoginResponse
  | PrometeoAPILoginSelectClientResponse
  | PrometeoAPILoginRequiresPersonalQuestionResponse
  | PrometeoAPILoginRequiresOTPResponse;

export type PrometeoAPILoginResponse =
  | PrometeoAPILoginAcceptableResponse
  | PrometeoAPIErrorLoginResponse;

export interface PrometeoAPISuccessfulLogoutResponse {
  status: "logged_out";
}

export type PrometeoAPILogoutResponse =
  | PrometeoAPISuccessfulLogoutResponse
  | PrometeoAPIErrorLoginResponse;

export interface PrometeoAPISuccessfulListBankAccountsResponse {
  status: "success";
  accounts: UserBankAccount[];
}

export type PrometeoAPIListBankAccountsResponse =
  | PrometeoAPISuccessfulListBankAccountsResponse
  | PrometeoAPIErrorInvalidKeyResponse;

/**
 * URL: https://banking.prometeoapi.net/client/
 *
 * Get clients
 */
export interface PrometeoAPIGetClientsPayload {
  key: string;
}

export interface PrometeoAPIGetClientsSuccessfulResponse {
  status: "success";
  clients: { [key: string]: string };
}

export type PrometeoAPIGetClientsErrorResponse =
  | PrometeoAPIErrorInvalidKeyResponse
  | PrometeoAPIErrorMissingAPIKeyResponse
  | PrometeoAPIErrorAPIKeyNotFoundResponse
  | PrometeoAPIGenericErrorResponse;

export type PrometeoAPIGetClientsResponse =
  | PrometeoAPIGetClientsSuccessfulResponse
  | PrometeoAPIGetClientsErrorResponse;

export type PrometeoAPISelectClientResponse =
  | PrometeoAPISelectClientSuccessfulResponse
  | PrometeoAPISelectClientWrongResponse
  | PrometeoAPIErrorInvalidKeyResponse;

export interface PrometeoAPISelectClientSuccessfulResponse {
  status: "success";
  // This key is only present in certain providers. It should
  // be returned to the client to use for future requests, otherwise
  // the client can keep using the same session key that used to perform
  // the request.
  key?: string;
}

export interface PrometeoAPISelectClientWrongResponse {
  status: "error";
  message: "wrong_client";
}

export interface PrometeoAPIListBankAccountMovementsPayload {
  key: string;
  account_number: string;
  currency: string;
  start_date: string;
  end_date: string;
}

export type PrometeoAPIListBankAccountMovementsResponse =
  | PrometeoAPIListBankAccountMovementsSuccessfulResponse
  | PrometeoAPIErrorInvalidKeyResponse;

export interface PrometeoAPIListBankAccountMovementsSuccessfulResponse {
  status: "success";
  movements: UserBankAccountMovement[];
}

export interface PrometeoAPIListInstitutionsForTransfersRequestBody {
  // Prometeo API's session key.
  key: string;
}

export interface PrometeoAPIListInstitutionsForTransfersSuccessfulResponse {
  status: "success";
  destinations: BankingInstitution[];
}

export type PrometeoAPIListInstitutionsForTransfersResponse =
  | PrometeoAPIListInstitutionsForTransfersSuccessfulResponse
  | PrometeoAPIErrorInvalidKeyResponse
  | PrometeoAPIErrorMissingAPIKeyResponse;

export interface PrometeoAPIPreprocessTransferRequestBody {
  // Prometeo API's session key.
  key: string;
  // The number of the account that will send the amount.
  origin_account: string;
  // The number of the account that will receive the amount.
  destination_account: string;
  // The ID of the institution the account belongs to. This endpoint can be
  // obtained from the Prometeo API's list of institutions for transfers.
  destination_institution: string;
  destination_owner_name: string; // !TODO: get
  // The currency that corresponds to the amount.
  //
  // The format must follow the ISO 4217 standard(https://www.iso.org/iso-4217-currency-codes.html).
  currency: string;
  // The amount to transfer.
  amount: number;
  // The concept under this amount will be transferred.
  concept: string;
  branch: string; // !TODO: get
}
