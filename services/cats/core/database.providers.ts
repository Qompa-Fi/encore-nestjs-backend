import { SQLDatabase } from "encore.dev/storage/sqldb";
import knex from "knex";
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

// Define a database named 'cats', using the database migrations
// in the "./migrations" folder. Encore automatically provisions,
// migrates, and connects to the database.
const DB = new SQLDatabase("cats", {
  migrations: "./migrations",
});

// Use Knex.js to connect to the database
const ORM = knex({
  client: "pg",
  connection: DB.connectionString,
});

export const databaseProviders = [
  {
    provide: "DATABASE_CONNECTION",
    useFactory: async () => ORM,
  },
];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // Note: this is optional
    await this.$connect()
  }
}