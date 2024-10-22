import { organizations as organizationMicroservice } from "~encore/clients";
import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

import {
  mayGetInternalUserIdFromAuthData,
  mustGetAuthData,
  mustGetUserIdFromPublicMetadata,
} from "@/lib/clerk";
import { toSerializableSunatProfile } from "./helpers/serializable";
import { checkSaveSunatProfileDto } from "./validators/request";
import applicationContext from "../applicationContext";
import { ServiceError } from "./service-errors";
import { checkRuc } from "@/lib/sunat";
import type {
  CountSunatProfilesResponse,
  SaveSunatProfileResponse,
  GetSunatProfileResponse,
  SearchByDNIResponse,
  SearchByRUCResponse,
  GetRubrosResponse,
} from "./types/response";
import type {
  SaveSunatProfileParams,
  SearchByDNIParams,
  SearchByRUCParams,
} from "./types/request";

export const searchByDNI = api<SearchByDNIParams, SearchByDNIResponse>(
  { expose: true, method: "GET", path: "/sunat/search-by-dni/:dni" },
  async ({ dni }) => {
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

export const searchByRUC = api<SearchByRUCParams, SearchByRUCResponse>(
  { expose: true, method: "GET", path: "/sunat/search-by-ruc/:ruc" },
  async ({ ruc }) => {
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

export const getRubros = api<void, GetRubrosResponse>(
  {
    expose: true,
    auth: false,
    method: "GET",
    path: "/sunat/rubros",
  },
  async () => {
    const { sunatService } = await applicationContext;

    log.debug("retrieving rubros...");

    const rubros = sunatService.getRubros();

    log.debug(`${rubros.length} rubros were retrieved`);

    return {
      rubros,
    };
  },
);

export const getSunatProfile = api<void, GetSunatProfileResponse>(
  {
    expose: true,
    auth: true,
    method: "GET",
    path: "/sunat/profile",
  },
  async () => {
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

    const { organizations } = await organizationMicroservice.getOrganizations();
    if (!organizations || organizations.length === 0) {
      throw ServiceError.createOrganizationFirst;
    }

    // for now a single user can have only one organization
    const organizationId = organizations[0].id;

    const profile = await sunatService.getSunatProfile(userId, organizationId);
    if (!profile) {
      throw APIError.notFound("sunat profile not found");
    }

    return {
      sunatProfile: toSerializableSunatProfile(profile),
    };
  },
);

export const countSunatProfiles = api<void, CountSunatProfilesResponse>(
  {
    expose: false,
    auth: true,
  },
  async () => {
    const userId = mayGetInternalUserIdFromAuthData();
    if (!userId) throw ServiceError.userNotFound;

    const { sunatService } = await applicationContext;

    try {
      const count = await sunatService.countSunatProfiles(userId);

      return { count };
    } catch (error) {
      log.error(error, "caught error while counting directories");
      throw ServiceError.somethingWentWrong;
    }
  },
);

export const saveSunatProfile = api<
  SaveSunatProfileParams,
  SaveSunatProfileResponse
>(
  {
    expose: true,
    auth: true,
    method: "POST",
    path: "/sunat/profile",
  },
  async (payload) => {
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

    const { organizations } = await organizationMicroservice.getOrganizations();
    if (!organizations || organizations.length === 0) {
      throw ServiceError.createOrganizationFirst;
    }

    // for now a single user can have only one organization
    const organizationId = organizations[0].id;

    const profile = await sunatService.saveSunatProfile(
      userId,
      organizationId,
      payload,
    );

    return {
      sunatProfile: toSerializableSunatProfile(profile),
    };
  },
);
