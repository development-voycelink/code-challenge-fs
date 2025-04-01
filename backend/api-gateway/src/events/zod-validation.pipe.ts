import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Pipe that validates the incoming request body against a Zod schema.
 *
 * @class
 *
 * @implements {PipeTransform}
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value) as unknown;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          errors: error.errors,
        });
      }
    }
  }
}
