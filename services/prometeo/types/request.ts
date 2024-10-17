import type {
  PrometeoAPILoginParams,
  PrometeoAPIPreprocessTransferRequestBody,
} from "./prometeo-api";
import type { Header } from "encore.dev/api";

export interface PrometeoSessionKeyHeader {
  // The session key to be passed to the Prometeo API.
  key: Header<"X-Prometeo-Session-Key">;
}

export type LoginParams = PrometeoAPILoginParams;

export type LogoutParams = PrometeoSessionKeyHeader;

export type QueryBankAccountMovementsParams = {
  // The account to query. See '/third-party/prometeo/accounts' to retrieve a list of accounts
  // in the current provider and/or client.
  account_number: string;
  // The currency that the account is denominated in.
  currency: string;
  // The date in 'dd/mm/yyyy' format from which to start querying movements.
  start_date: string;
  // The date in 'dd/mm/yyyy' format until which to query movements.
  end_date: string;
} & PrometeoSessionKeyHeader;

export type ListClientsParams = PrometeoSessionKeyHeader;

export type ListBankAccountsParams = PrometeoSessionKeyHeader;

export interface SelectClientParams {
  // The session key to be passed to the Prometeo API. This is
  // a key that is supposed to be waiting for this operation.
  key: Header<"X-Prometeo-Session-Key">;
  // The ID of the client to use for the current session.
  client: string;
}

export type ListInstitutionsForTransfersParams = PrometeoSessionKeyHeader;

export type PreprocessTransferParams = PrometeoAPIPreprocessTransferRequestBody;
