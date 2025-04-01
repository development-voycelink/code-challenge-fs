import {
  Controller,
  Post,
  UsePipes,
  UseGuards,
  Body,
  HttpCode,
} from '@nestjs/common';
import { ApiKeyGuard } from './auth/api-key.guard';
import { InjestEventDto, injestEventSchema } from './event.dto';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('events')
export class EventsController {
  @Post()
  @UseGuards(ApiKeyGuard)
  @UsePipes(new ZodValidationPipe(injestEventSchema))
  @HttpCode(202)
  injestEvent(@Body() injestEventDto: InjestEventDto) {}
}
