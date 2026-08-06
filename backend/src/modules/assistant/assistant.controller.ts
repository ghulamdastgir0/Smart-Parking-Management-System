import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AssistantEvent, AssistantService } from './assistant.service';
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
      'Approve or reject a pending mutating action proposed by the assistant',
    description:
      'Streamed as Server-Sent Events, same event shape as POST /assistant/chat.',
  })
  async resume(
    @Body() dto: ResumeChatDto,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const user = req.user as AuthenticatedUser;
    await this.pipeToSse(
      res,
      this.assistantService.resumeChat(user, dto.approved),
    );
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
