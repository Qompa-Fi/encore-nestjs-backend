import { Module } from "@nestjs/common";
import { TruoraService } from "./truora.service";

@Module({
  providers: [TruoraService],
  exports: [TruoraService],
})
export class TruoraModule {}
