import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import type { ISunatProfileResponse } from "./dtos/sunat-profile-response.dto";
import type { AuthenticatedUser } from "../auth/interfaces/clerk.interface";
import type { SearchDNIResponseDto } from "./dtos/search-by-dni.dto";
import type { SearchRUCResponseDto } from "./dtos/search-by-ruc.dto";
import { toSerializableSunatProfile } from "./helpers/serializable";
import type { GetRubrosDto } from "./dtos/get-rubros.dto";
import { QOMPA_INTERNAL_USER_ID_KEY } from "../auth/auth";
import applicationContext from "../applicationContext";
import { mustGetAuthData } from "@/lib/clerk";
import { checkRuc } from "@/lib/sunat";
import {
  checkSaveSunatProfileDto,
  type ISaveSunatProfileDto,
} from "./dtos/save-sunat-profile.dto";

const mustGetUserIdFromPublicMetadata = (
  authenticatedUser: AuthenticatedUser,
): number => {
  const userId = authenticatedUser.metadata.publicMetadata[
    QOMPA_INTERNAL_USER_ID_KEY
  ] as number | undefined;
  if (!userId) {
    throw APIError.notFound("you should create your user first");
  }

  return userId;
};

export const searchByDNI = api(
  { expose: true, method: "GET", path: "/sunat/search-by-dni/:dni" },
  async ({ dni }: { dni: string }): Promise<SearchDNIResponseDto> => {
    if (!dni) throw APIError.invalidArgument("dni is required");

    if (dni.length !== 8)
      throw APIError.invalidArgument("dni must have 8 digits");
    if (Number.isNaN(Number.parseInt(dni)))
      throw APIError.invalidArgument("dni must be contain only digits");

    const { sunatService } = await applicationContext;

    const result = await sunatService.searchByDNI(dni);
    if (!result) {
      throw APIError.notFound("dni not found");
    }

    return {
      dni: result,
    };
  },
);

export const searchByRUC = api(
  { expose: true, method: "GET", path: "/sunat/search-by-ruc/:ruc" },
  async ({ ruc }: { ruc: string }): Promise<SearchRUCResponseDto> => {
    const errorMessage = checkRuc(ruc);
    if (errorMessage) throw APIError.invalidArgument(errorMessage);

    const { sunatService } = await applicationContext;

    try {
      const result = await sunatService.searchByRUC(ruc);
      if (!result) {
        throw APIError.notFound("ruc not found");
      }

      return {
        ruc: result,
      };
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      console.error(
        `something went unexpectedly wrong while searching by RUC '${ruc}': ${error}`,
      );

      throw APIError.internal("something went wrong");
    }
  },
);

export const getRubros = api(
  {
    expose: true,
    auth: false,
    method: "GET",
    path: "/sunat/rubros",
  },
  async (): Promise<GetRubrosDto> => {
    const { sunatService } = await applicationContext;

    log.debug("retrieving rubros...");

    const rubros = sunatService.getRubros();

    log.debug(`${rubros.length} rubros were retrieved`);

    return {
      rubros,
    };
  },
);

export const getSunatProfile = api(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/sunat/profile",
  },
  async (): Promise<ISunatProfileResponse> => {
    const authenticatedUser = mustGetAuthData();
    const clerkId = authenticatedUser.userID;

    log.debug(
      `user identified with clerk id '${clerkId}' wants to get its sunat profile`,
    );

    const userId = mustGetUserIdFromPublicMetadata(authenticatedUser);
    if (!userId) throw APIError.notFound("you should create your user first");

    log.debug(
      `qompa internal user id is '${userId}'...(clerk id was '${clerkId}')`,
    );

    const { sunatService } = await applicationContext;

    const profile = await sunatService.getSunatProfile(userId);
    if (!profile) {
      throw APIError.notFound("sunat profile not found");
    }

    return {
      sunatProfile: toSerializableSunatProfile(profile),
    };
  },
);

export const saveSunatProfile = api(
  {
    expose: true,
    auth: true,
    method: "POST",
    path: "/sunat/profile",
  },
  async (payload: ISaveSunatProfileDto): Promise<ISunatProfileResponse> => {
    const apiError = checkSaveSunatProfileDto(payload);
    if (apiError) throw apiError;

    const authenticatedUser = mustGetAuthData();
    const clerkId = authenticatedUser.userID;

    log.debug(
      `user identified with clerk id '${clerkId}' wants to save its sunat profile`,
    );

    const userId = mustGetUserIdFromPublicMetadata(authenticatedUser);
    if (!userId) throw APIError.notFound("you should create your user first");

    log.debug(
      `qompa internal user id is '${userId}'...(clerk id was '${clerkId}')`,
    );

    const { sunatService } = await applicationContext;

    const profile = await sunatService.saveSunatProfile(userId, payload);

    return {
      sunatProfile: toSerializableSunatProfile(profile),
    };
  },
);
