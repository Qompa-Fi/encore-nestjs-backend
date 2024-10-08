import type { UserBankAccount } from "@/services/prometeo/types/user-account";

interface ExportableDirectory {
  id: number;
  name: string | null;
  provider_name: string;
  created_at: string;
  updated_at: string | null;
}

export interface SetupProviderAccessResponse {
  directory: ExportableDirectory;
}

export interface ListConfiguredProviderAccessResponse {
  data: ExportableDirectory[];
}

export interface ListDirectoryAccountsResponse {
  data: UserBankAccount[];
}
