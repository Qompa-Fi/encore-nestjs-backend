import type { Query } from "encore.dev/api";

import type { PrometeoCredentials } from "./prometeo-credentials";
import type { PreprocessTranferDto } from "../dtos/preprocess-transfer.dto";

export interface SubmitDirectoryParams {
  // Optional. The name that the directory will have.
  name?: string;
  prometeo_provider: string;
  credentials: PrometeoCredentials;
}

export interface RenameDirectoryParams {
  id: number;
  // The new name that the directory will receive.
  name: string | null;
}

export interface DeleteDirectoryParams {
  id: number;
}

export interface ListDirectoryAccountsParams {
  id: number;
}

export interface QueryDirectoryAccountMovementsParams {
  id: number;
  account_number: string;
  currency: Query<string>;
  start_date: Query<string>;
  end_date: Query<string>;
}

export interface ListDirectoryInstitutionsParams {
  id: number;
}

export type RequestTransferParams = {
  id: number;
} & PreprocessTranferDto;

export interface ConfirmTransferParams {
  id: number;
  request_id: string;
  authorization_type: string;
  authorization_data: string;
  authorization_device_number?: string;
}
