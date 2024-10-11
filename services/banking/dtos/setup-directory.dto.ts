import type { PrometeoCredentials } from "../types/prometeo-credentials";

export interface ISetupDirectory {
  name?: string;
  prometeo_provider: string;
  credentials: PrometeoCredentials;
}
