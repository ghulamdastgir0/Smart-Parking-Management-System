import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  AssistantEvent,
  AssistantService,
  ChatContext,
  ResumeValue,
} from './assistant.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ResumeChatDto } from './dto/resume-chat.dto';

@ApiTags('Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @Post('chat')
  @ApiOperation({
    summary: 'Send a message to the AI assistant',
    description:
      'Streamed as Server-Sent Events (token/tool_call/tool_result/confirmation_required/done/error). ' +
      "Continues the user's single ongoing conversation (thread = the authenticated user).",
  })
  async chat(
    @Body() dto: ChatMessageDto,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const user = req.user as AuthenticatedUser;
    await this.pipeToSse(
      res,
      this.assistantService.streamChat(user, dto.message, {
        timezone: dto.timezone,
        location:
          dto.latitude !== undefined && dto.longitude !== undefined
            ? { latitude: dto.latitude, longitude: dto.longitude }
            : undefined,
      }),
    );
  }

  @Post('chat/resume')
  @ApiOperation({
    summary:
      'Answer a pending interrupt: approve/reject a mutating action, or answer a location request',
    description:
      'Streamed as Server-Sent Events, same event shape as POST /assistant/chat.',
  })
  async resume(
    @Body() dto: ResumeChatDto,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const user = req.user as AuthenticatedUser;
    const hasCoords = dto.latitude !== undefined && dto.longitude !== undefined;
    const resumeValue: ResumeValue = hasCoords
      ? { latitude: dto.latitude!, longitude: dto.longitude! }
      : (dto.approved ?? null);
    // Rebuilding the agent's system prompt on resume (see AssistantService#buildGraph) would
    // otherwise silently drop the timezone/location the original message provided — resending
    // them here keeps the prompt consistent for the rest of the turn. When this resume *is* the
    // location answer, those same coordinates double as the location context too.
    const context: ChatContext = {
      timezone: dto.timezone,
      location: hasCoords ? { latitude: dto.latitude!, longitude: dto.longitude! } : undefined,
    };
    await this.pipeToSse(res, this.assistantService.resumeChat(user, resumeValue, context));
  }

  private async pipeToSse(
    res: Response,
    events: AsyncGenerator<AssistantEvent>,
  ): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    try {
      for await (const event of events) {
        // If the client already disconnected (closed the panel, navigated away, tab reload),
        // `res.write` throws — letting that escape here would reach Nest's global exception
        // filter, which tries to call `res.status().json()` on a response whose headers are
        // already sent, crashing the request without ever calling `res.end()`. That leaves the
        // (now-unreachable) client's fetch dangling instead of failing fast.
        if (res.writableEnded || !res.writable) break;
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      // Client is gone; nothing left to write to.
    } finally {
      if (!res.writableEnded) res.end();
    }
  }
}
