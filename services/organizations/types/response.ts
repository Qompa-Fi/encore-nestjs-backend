import type { SerializableOrganization } from "../interfaces/serializable-organization.interface";

export interface GetOrganizationsResponse {
  organizations: SerializableOrganization[];
}

export interface GetUserOrganizationResponse {
  organization: SerializableOrganization;
}

export interface CreateOrganizationResponse {
  organization: SerializableOrganization;
}
