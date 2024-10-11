import type { PrometeoCredentials } from "../types/prometeo-credentials";

export interface ISetupDirectory {
  // Optional. The name that the directory will have.
  name?: string;
  prometeo_provider: string;
  credentials: PrometeoCredentials;
}
