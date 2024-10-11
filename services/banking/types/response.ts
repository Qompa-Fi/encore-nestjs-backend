import type { BankingInstitution } from "@/services/prometeo/types/institution";
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

export interface SetupDirectoryResponse {
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
  data: BankingInstitution[];
}

export interface ConfirmTransferResponse {
  result: {
    message: string;
    success: boolean;
  };
}
