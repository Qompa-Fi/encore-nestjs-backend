import { Module } from "@nestjs/common";
import { PrismaService } from "./database.providers";

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
