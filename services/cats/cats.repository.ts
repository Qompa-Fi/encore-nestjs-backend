import { Inject, Injectable } from "@nestjs/common";
import type { Knex } from "knex";
import type { CreateCatDto } from "./dto/create-cat.dto";
import type { Cat } from "./interfaces/cat.interface";
import { PrismaService } from './prisma.service';

@Injectable()
export class CatsRepository {
  constructor(
    @Inject("CAT_MODEL") private readonly db: () => PrismaService,
  ) {}

  async create(createCatDto: CreateCatDto): Promise<void> {
    await this.db().insert(createCatDto, "*");
    return;
  }

  async get(id: number): Promise<Cat> {
    return this.db().where("id", id).first();
  }

  async findAll(): Promise<Cat[]> {
    return await this.db().select();
  }
}
