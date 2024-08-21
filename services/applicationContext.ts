import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { CatsModule } from "./cats/cats.module";
import { CatsRepository } from "./cats/cats.repository";

// Mounting the application as bare Nest standalone application so that we can use
// the Nest services inside our Encore endpoints
const applicationContext: Promise<{ catsService: CatsRepository }> =
  NestFactory.createApplicationContext(AppModule).then((app) => {
    return {
      catsService: app.select(CatsModule).get(CatsRepository, { strict: true }),
    };
  });

export default applicationContext;
