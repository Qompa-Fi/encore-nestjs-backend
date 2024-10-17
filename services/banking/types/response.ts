import type { BankingInstitution } from "@/services/prometeo/types/institution";
import type { Provider } from "@/services/prometeo/types/provider";
import type { TransferRequest } from "@/services/prometeo/types/transference";
import type {
  UserBankAccountMovement,
  UserBankAccount,
} from "@/services/prometeo/types/user-account";

interface ExportableDirectory {
  id: number;
  name: string | null;
  provider_name: string;
  created_at: string;
  updated_at: string | null;
}

export interface SubmitDirectoryResponse {
  directory: ExportableDirectory;
}

export interface ListDirectoriesResponse {
  data: ExportableDirectory[];
}

export interface ListDirectoryAccountsResponse {
  data: UserBankAccount[];
}

export interface QueryAccountMovementsResponse {
  data: UserBankAccountMovement[];
}

export interface ListDirectoryInstitutionsResponse {
  // The list of institutions that the user should use when trying to specify an account number or CCI.
  data: BankingInstitution[];
}

export interface ConfirmTransferResponse {
  result: {
    message: string;
    success: boolean;
  };
}

export interface ListCatalogResponse {
  data: Provider[];
}

export interface PreprocessTranferResponse {
  request: TransferRequest;
}
