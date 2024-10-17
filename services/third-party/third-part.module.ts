import { Module } from "@nestjs/common";
import { TruoraModule } from "./truora.module";
import { TruoraService } from "./truora.service";

@Module({
  providers: [TruoraService],
  imports: [TruoraModule],
})
export class ThirdPartyModule {}
