import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiKeyService } from 'src/events/auth/api-key.service';
@Module({
  imports: [
    ConfigModule.forRoot({
      ignoreEnvFile: true,
    }),
  ],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class AuthModule {}
