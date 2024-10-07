export interface SetupProviderAccessResponse {
  issued_access: {
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
