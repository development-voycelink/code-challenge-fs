import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyService {
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('API_KEY');
    if (!apiKey) {
      throw new Error(
        'Failed to instaniate ApiKeyService: API_KEY is not presented in the environment variables',
      );
    }

    this.apiKey = apiKey;
  }

  isApiKeyValid(apiKey: string): boolean {
    return apiKey === this.apiKey;
  }
}
