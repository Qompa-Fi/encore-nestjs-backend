import { Module } from "@nestjs/common";
import { catsProviders } from "./cats.providers";
import { CatsRepository } from "./cats.repository";
import { DatabaseModule } from "./core/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [CatsRepository, ...catsProviders],
})
export class CatsModule {}
