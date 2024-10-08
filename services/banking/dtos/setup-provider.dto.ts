import type { PrometeoCredentials } from "../types/prometeo-credentials";

export interface ISetupProviderAccessInputDto {
  name?: string;
  prometeo_provider: string;
  credentials: PrometeoCredentials;
}
