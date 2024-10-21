import type { SerializableSunatProfile } from "../interfaces/serializable-sunat-profile.interface";
import type { IRubro } from "../interfaces/rubro.interface";
import type { IDNI } from "../interfaces/dni.interface";
import type { IRUC } from "../interfaces/ruc.interface";

export interface SearchByDNIResponse {
  dni: IDNI;
}

export interface SearchByRUCResponse {
  ruc: IRUC;
}

export interface GetRubrosResponse {
  rubros: IRubro[];
}

export interface GetSunatProfileResponse {
  sunatProfile: SerializableSunatProfile;
}

export type SaveSunatProfileResponse = GetSunatProfileResponse;
