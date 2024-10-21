import type { TeamSize } from "./team-size";

export interface GetUserOrganizationParams {
  id: number;
}

export interface CreateOrganizationParams {
  name: string;
  category: string;
  ruc: string;
  size: TeamSize;
}
