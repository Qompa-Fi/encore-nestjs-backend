import type { UserBankAccount, UserBankAccountMovement } from "./user-account";
import type { BankingInstitution } from "./institution";
import type { TransferRequest } from "./transference";

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
export interface PrometeoAPILoginParams {
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

export interface PrometeoAPIPreprocessTransferRequestBodyRestrictedToProvider {
  // Identity card number (only applies to supplier Banco de Bogotá Corporativo de Colombia).
  document_number?: string;
  // Type of identity document (only applies to supplier Banco de Bogotá Corporativo de Colombia).
  document_type?: string;
  // Name or company name of the account holder (only applies for virtual transfers from the provider RedLink Corporativo Argentina).
  origin_holder: string;
  // CUIT of the account holder (only applies for virtual transfers from the provider RedLink Corporativo Argentina).
  origin_cuit?: string;
  // CVU of the originating account (only applies for virtual transfers from the provider RedLink Corporate Argentina).
  origin_cvu?: string;
  // CUIT of the recipient (only applies for virtual transfers from the provider RedLink Corporativo Argentina).
  destination_cuit?: string;
  // Voucher Identifier - Optional (only applies to virtual transfers from RedLink Corporate Argentina provider).
  voucher_id?: number;
}

/**
 * Prometeo API Reference: https://docs.prometeoapi.com/reference/transferpreprocess.
 */
export type PrometeoAPIPreprocessTransferRequestBody =
  // PrometeoAPIPreprocessTransferRequestBodyRestrictedToProvider & {
  {
    // Prometeo API's session key.
    key: string;
    // The number of the account that will send the amount.
    origin_account: string;
    // The number of the account that will receive the amount.
    destination_account: string;
    // The ID of the institution the account belongs to. This endpoint can be
    // obtained from the Prometeo API's list of institutions for transfers.
    destination_institution: number;
    // Optional if not applicable. The name of the owner of the destination account.
    destination_owner_name?: string;
    // Optional if not applicable. Type of target account.
    destination_account_type?: string;
    authorization_device_number?: string;
    // The concept under this amount will be transferred.
    concept: string;
    // Optional if not applicable. The branch number of the destination account.
    branch?: number;
    // The currency that corresponds to the amount.
    //
    // The format must follow the ISO 4217 standard(https://www.iso.org/iso-4217-currency-codes.html).
    currency: string;
    // The amount to transfer.
    amount: number;
  };

export interface PrometeoAPIPreprocessTransferSuccessfulResponse {
  result: TransferRequest;
  status: "success";
}

export type PrometeoAPIPreprocessTransferResponse =
  | PrometeoAPIPreprocessTransferSuccessfulResponse
  | PrometeoAPIErrorInvalidKeyResponse
  | PrometeoAPIErrorMissingAPIKeyResponse;

/**
 * {
  "result": {
    "approved": true,
    "authorization_devices": [
      {
        "data": [
          "F-4",
          "B-2",
          "G-7"
        ],
        "type": "cardCode"
      },
      {
        "data": null,
        "type": "pin"
      }
    ],
    "message": null,
    "request_id": "0b7d6b32d1be4c11bde21e7ddc08cc36"
  },
  "status": "success"
}
 */

export interface PrometeoAPIConfirmTransferRequestBody {
  key: string;

  // ID of the request returned by the transfer preprocessing
  // endpoint of the Prometeo API.
  request_id: string;
  // Name of the verification method to be used, corresponds to
  // the type field in the list of verification methods returned
  // by the transfer preprocessing endpoint of the Prometeo API.
  //
  // If no verification method is required, this parameter is left
  // empty.
  authorization_type: string;
  // Verification value (pin number, coordinate card response,etc.)
  // if there are several values, they must be separated by comma.
  authorization_data: string;
  // ! careful if 'authorization_device_number' was required in preprocess
  // 'authorization_device_number': transfer_data['authorization_device_number']
  authorization_device_number?: string;
}

export interface PrometeoAPIConfirmTransferSuccessfulResponse {
  status: "success";
  transfer: {
    message: string;
    success: boolean;
  };
}

export type PrometeoAPIConfirmTransferResponse =
  | PrometeoAPIConfirmTransferSuccessfulResponse
  | PrometeoAPIErrorInvalidKeyResponse
  | PrometeoAPIErrorMissingAPIKeyResponse;
