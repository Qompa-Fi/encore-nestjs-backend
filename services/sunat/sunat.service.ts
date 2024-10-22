import { Injectable, type OnModuleInit } from "@nestjs/common";
import { PrismaClient, type SunatProfile } from "@prisma/client";
import { organizations, users } from "~encore/clients";
import { parse as parseHtml } from "node-html-parser";
import { secret } from "encore.dev/config";
import { APIError } from "encore.dev/api";
import log from "encore.dev/log";
import axios from "axios";

import type { LegalRepresentativeDto } from "./interfaces/legal-representative.interface";
import { checkSaveSunatProfileDto } from "./validators/request";
import type { SaveSunatProfileParams } from "./types/request";
import type { IRubro } from "./interfaces/rubro.interface";
import applicationContext from "../applicationContext";
import type { IRUC } from "./interfaces/ruc.interface";
import type { IDNI } from "./interfaces/dni.interface";
import { ServiceError } from "./service-errors";

interface EntitySearchParam {
  type: "RUC" | "DNI";
  number: string;
}

const apiPeruLambdaApiKey = secret("ApiPeruLambdaApiKey");
const sunatEncryptionKey = secret("SunatEncryptionKey");
const apiPeruLambdaUrl = secret("ApiPeruLambdaUrl");

@Injectable()
export class SunatService extends PrismaClient implements OnModuleInit {
  private sunatEncryptionKey: string;

  async onModuleInit() {
    await this.$connect();
  }

  constructor() {
    super();

    this.sunatEncryptionKey = sunatEncryptionKey();
  }

  getRubros(): IRubro[] {
    return [
      {
        id: "associations-extraterritorial-organizations",
        name: "Asociaciones y Organizaciones Extraterritoriales",
      },
      {
        id: "agricultural",
        name: "Agropecuario",
      },
      {
        id: "mining-hydrocarbons",
        name: "Minería e Hidrocarburos",
      },
      {
        id: "fishing",
        name: "Pesca",
      },
      {
        id: "services",
        name: "Servicios",
      },
      {
        id: "fintech",
        name: "Fintech",
      },
      {
        id: "commerce",
        name: "Comercio",
      },
      {
        id: "construction",
        name: "Construcción",
      },
      {
        id: "manufacturing-primary-resource-processors",
        name: "Manufactura - Procesadores de Recursos Primarios",
      },
      {
        id: "manufacturing-non-primary-industry",
        name: "Manufactura - Industria No Primaria",
      },
      {
        id: "securities-intermediation",
        name: "Intermediación de Valores",
      },
    ];
  }

  async getSunatProfile(
    userId: number,
    organizationId: number,
  ): Promise<SunatProfile | null> {
    return this.sunatProfile.findFirst({
      where: {
        userId,
        organizationId,
      },
    });
  }

  async saveSunatProfile(
    userId: number,
    organizationId: number,
    payload: SaveSunatProfileParams,
  ): Promise<SunatProfile> {
    const apiError = checkSaveSunatProfileDto(payload);
    if (apiError) throw apiError;

    const { userExists } = await users.existsById({ id: userId });
    if (!userExists) {
      log.error(
        `user with id '${userId}' not found but it tried to save its sunat profile`,
      );
      throw APIError.notFound("user not found");
    }

    const alreadyExists = await this.sunatProfileExists(userId, organizationId);
    if (alreadyExists) {
      log.warn(
        `user with id '${userId}' already has a sunat profile but it tried to save its sunat profile`,
      );
      throw APIError.alreadyExists("user already has a sunat profile");
    }

    const { organization } = await organizations.getUserOrganization({
      id: organizationId,
    });

    const { valid: validCredentials } = await this.loginWithCredentials({
      ruc: organization.ruc,
      username: payload.solUsername,
      password: payload.solKey,
    });
    if (!validCredentials) {
      throw ServiceError.invalidSolCredentials;
    }

    const { securityService } = await applicationContext;

    const encryptedSolKey = securityService.encryptAES256(
      payload.solKey,
      this.sunatEncryptionKey,
    );

    const profile = await this.sunatProfile.create({
      data: {
        organizationId,
        userId,
        solUsername: payload.solUsername,
        encryptedSolKey,
      },
    });

    return profile;
  }

  async sunatProfileExists(
    userId: number,
    organizationId: number,
  ): Promise<boolean> {
    return (
      (await this.sunatProfile.count({ where: { userId, organizationId } })) > 0
    );
  }

  async searchByRUC(ruc: string): Promise<IRUC | null> {
    const [results, representatives] = await Promise.all([
      this.searchEntities<IRUC>([
        {
          type: "RUC",
          number: ruc,
        },
      ]),
      this.searchLegalRepresentsByRUC(ruc),
    ]);

    const result = results.find((result) => result.ruc === ruc);
    if (!result) return null;

    if (representatives) {
      result.representatives = representatives;
    }

    return result;
  }

  async countSunatProfiles(userId: number): Promise<number> {
    return this.sunatProfile.count({ where: { userId } });
  }

  async searchByDNI(dni: string): Promise<IDNI | null> {
    const results = await this.searchEntities<IDNI>([
      {
        type: "DNI",
        number: dni,
      },
    ]);

    return results.find((result) => result.dni === dni) ?? null;
  }

  private async searchEntities<T>(
    documents: EntitySearchParam[],
  ): Promise<T[]> {
    if (documents.length === 0) return [];

    const response = await fetch(apiPeruLambdaUrl(), {
      method: "POST",
      headers: {
        "X-Api-Key": apiPeruLambdaApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documents,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `failed to search entities(${documents}), response status: ${response.statusText}`,
      );
    }

    const results = await response.json();

    return results as T[];
  }

  private async searchLegalRepresentsByRUC(
    ruc: string,
  ): Promise<Array<LegalRepresentativeDto> | null> {
    const params = new URLSearchParams();

    params.append("accion", "getRepLeg");
    params.append("nroRuc", ruc);
    params.append("desRuc", "");

    const { data } = await axios.post(
      "https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/jcrS00Alias",
      params,
    );

    const sanitize = (s: string): string =>
      s
        .replace(/^[\\r\\n\s]+/, "")
        .replace(/[\\r\\n\s]+$/, "")
        .replace("  ", " ");

    const document = parseHtml(data);
    const tds = document.querySelectorAll(".panel .table td");
    const results: Array<LegalRepresentativeDto> = [];

    if (tds.length === 0) return null;

    for (let i = 0; i < tds.length; i += 5) {
      const type = sanitize(tds[i].innerText);
      const number = sanitize(tds[i + 1].innerText);
      const names = sanitize(tds[i + 2].innerText);
      const role = sanitize(tds[i + 3].innerText);
      const since = sanitize(tds[i + 4].innerText);

      results.push({
        document: { type, number },
        names,
        role,
        since,
      });
    }

    return results;
  }

  async loginWithCredentials(credentials: {
    ruc: string;
    username: string;
    password: string;
  }): Promise<{
    valid: boolean;
  }> {
    const oauth2Endpoint = await this.initOauth2Endpoint();
    if (!oauth2Endpoint) return { valid: false };

    const structuredOauth2Endpoint = new URL(oauth2Endpoint);

    const state = structuredOauth2Endpoint.searchParams.get("state") ?? "";

    structuredOauth2Endpoint.search = "";
    const urlWithoutParams = structuredOauth2Endpoint.toString();
    const trimmedEndpoint = urlWithoutParams.substring(
      0,
      urlWithoutParams.lastIndexOf("/"),
    );

    const response = await fetch(`${trimmedEndpoint}/j_security_check`, {
      method: "POST",
      headers: {
        Accept: "text/html",
        Origin: "https://api-seguridad.sunat.gob.pe",
        Referer: "https://e-menu.sunat.gob.pe/",
        DNT: "1",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        tipo: "2",
        dni: "",
        custom_ruc: credentials.ruc,
        j_username: credentials.username,
        j_password: credentials.password,
        captcha: "",
        state,
        originalUrl: "",
      }),
      redirect: "follow",
    });

    const document = await response.text();

    return {
      valid: document.includes("Bienvenidos a SUNAT"),
    };
  }

  private async initOauth2Endpoint(): Promise<string | null> {
    const response = await fetch(
      "https://e-menu.sunat.gob.pe/cl-ti-itmenu/MenuInternet.htm",
      {
        credentials: "include",
        headers: {
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.5",
          Origin: "https://api-seguridad.sunat.gob.pe",
          Referer: "https://e-menu.sunat.gob.pe/",
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
          DNT: "1",
        },
      },
    );

    const body = await response.text();

    // https://stackoverflow.com/a/6041965 :)
    const rxUrlWithParams =
      /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/;

    const matches = body.match(rxUrlWithParams);
    if (matches) {
      for (const match of matches) {
        if (
          match.includes("https://api-seguridad.sunat.gob.pe/v1/clientessol")
        ) {
          return match;
        }
      }
    }

    return null;
  }
}
