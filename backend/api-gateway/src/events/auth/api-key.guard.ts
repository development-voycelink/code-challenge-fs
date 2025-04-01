import { Request } from 'express';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyService } from './api-key.service';

/**
 * Guard that checks the validity of an API key provided in the request header.
 *
 * @class
 *
 * @implements {CanActivate}
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /**
   * Checks if the request contains a valid API key.
   *
   * @param {ExecutionContext} context - The execution context.
   *
   * @returns {boolean} - Returns true if the API key is valid, otherwise throws an UnauthorizedException.
   */
  canActivate(context: ExecutionContext): boolean | never {
    const req: Request = context.switchToHttp().getRequest();
    let key = req.headers['x-api-key'];
    if (key) {
      if (Array.isArray(key)) {
        key = key[0];
      }
      if (this.apiKeyService.isApiKeyValid(key)) {
        return true;
      }
    }

    throw new UnauthorizedException();
  }
}
