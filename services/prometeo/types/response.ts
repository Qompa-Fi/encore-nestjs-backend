import type { UserBankAccount, UserBankAccountMovement } from "./user-account";
import type { PrometeoAPIConfirmTransferRequestBody } from "./prometeo-api";
import type { BankingInstitution } from "./institution";
import type { TransferRequest } from "./transference";
import type { Provider } from "./provider";
import type { Client } from "./client";

export interface LoginResponse {
  session: {
    /**
     * @description The key that represents the session in the Prometeo API.
     */
    key: string;
    /**
     * @description The next step that the user needs to do in order to make its session work (if any).
     */
    requires: "nothing" | "specify_client" | "otp_code" | "answer_question";
  };
  /**
   * @description The accounts(clients) that are associated with the user of the session. The user will need to choose one of them in order to start querying data with the current session.
   */
  clients?: Client[];
}

export interface LogoutResponse {
  // Whether the logout was successful or not.
  success: boolean;
}

export interface QueryBankAccountMovementsResponse {
  // An array containing all the movements that the specified account has made in the specified currency.
  data: UserBankAccountMovement[];
}

export interface ListProvidersResponse {
  // An array with all the providers that the Prometeo API supports.
  data: Provider[];
}

export interface ListClientsResponse {
  /**
   * @description The accounts(clients) that are associated with the user of the session. The user will need to choose one of them in order to start querying data with the current session.
   */
  data: Client[];
}

export interface ListBankAccountsResponse {
  // An array containing all the accounts that the specified session key has access to.
  data: UserBankAccount[];
}

export interface SelectClientResponse {
  // The session key to be passed to the Prometeo API. This key
  // might change in certain providers so the previous is invalidated.
  key: string;
}

export interface ListInstitutionsForTransfersResponse {
  // An array(originally destinations) containing all the institutions that the specified session key has access to.
  data: BankingInstitution[];
}

export interface PreprocessTransferResponse {
  request: TransferRequest;
}

export type ConfirmTransferParams = PrometeoAPIConfirmTransferRequestBody;

export interface ConfirmTransferResponse {
  result: {
    message: string;
    success: boolean;
  };
}
