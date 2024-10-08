import type { UserBankAccount } from "@/services/prometeo/types/user-account";

export interface SetupProviderAccessResponse {
  directory: {
    id: number;
    provider_name: string;
  };
}

export interface ListConfiguredProviderAccessResponse {
  data: {
    id: number;
    provider_name: string;
  }[];
}

export interface ListDirectoryAccountsResponse {
  data: UserBankAccount[];
}
