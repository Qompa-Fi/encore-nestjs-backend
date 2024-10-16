import { Injectable, type OnModuleInit } from "@nestjs/common";
import { APIError } from "encore.dev/api";
import { sunat } from "~encore/clients";
import log from "encore.dev/log";
import {
  type Organization as OrganizationModel,
  OrganizationRole,
  type Prisma,
  PrismaClient,
} from "@prisma/client";

import type { IRubro } from "@/services/sunat/interfaces/rubro.interface";
import { ServiceError } from "./service-errors";

@Injectable()
export class OrganizationsService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async findUserOrganization(
    userId: number,
    organizationId: number,
  ): Promise<OrganizationModel | null> {
    return await this.organization.findUnique({
      where: {
        id: organizationId,
        organizationMembers: {
          every: {
            userId,
          },
        },
      },
    });
  }

  async getAllForUser(userId: number): Promise<OrganizationModel[]> {
    return await this.organization.findMany({
      where: {
        organizationMembers: {
          some: {
            userId,
          },
        },
      },
    });
  }

  async getAvailableRubroIds(): Promise<string[]> {
    try {
      const { rubros }: { rubros: IRubro[] } = await sunat.getRubros();

      return rubros.map((r: IRubro) => r.id);
    } catch (error) {
      if (error instanceof APIError) throw error;

      log.error(
        `failed to get rubros to validate 'create organization' payload: ${error}`,
      );

      throw ServiceError.somethingWentWrong;
    }
  }

  async create(
    userId: number,
    inputs: Prisma.OrganizationCreateInput,
  ): Promise<OrganizationModel> {
    if (await this.existsByRuc(inputs.ruc)) {
      throw APIError.alreadyExists(
        "organization with specified ruc already exists",
      );
    }

    try {
      const organization = await this.$transaction(
        async (tx): Promise<OrganizationModel> => {
          const organization = await tx.organization.create({
            data: inputs,
          });

          await tx.organizationMembers.create({
            data: {
              organizationId: organization.id,
              role: OrganizationRole.owner,
              userId: userId,
            },
          });

          return organization;
        },
      );

      return organization;
    } catch (error) {
      log.error(error);
      throw APIError.internal("something went wrong creating the organization");
    }
  }

  async existsByRuc(ruc: string): Promise<boolean> {
    const count = await this.organization.count({
      where: { ruc },
    });

    return count > 0;
  }
}
