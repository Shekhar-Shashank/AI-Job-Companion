import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

class ChatMessageDto {
  @IsString({ message: 'Message must be a string' })
  @MinLength(1, { message: 'Message cannot be empty' })
  message: string;

  @IsOptional()
  @IsString({ message: 'Conversation ID must be a string' })
  conversationId?: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Send a chat message (streaming)' })
  async chat(
    @CurrentUser() user: User,
    @Body() body: ChatMessageDto,
    @Res() res: Response,
  ) {
    console.log('Chat request received:', { userId: user?.id, message: body?.message?.substring(0, 50), conversationId: body?.conversationId });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      if (!body.message || body.message.trim().length === 0) {
        res.write(`data: ${JSON.stringify({ type: 'error', content: 'Message is required' })}\n\n`);
        res.end();
        return;
      }

      const stream = this.chatService.chatStream(
        user.id,
        body.message.trim(),
        body.conversationId,
      );

      for await (const event of stream) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      console.error('Chat stream error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.write(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`);
    } finally {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

  @Post('sync')
  @ApiOperation({ summary: 'Send a chat message (non-streaming)' })
  async chatSync(@CurrentUser() user: User, @Body() body: ChatMessageDto) {
    return this.chatService.chat(user.id, body.message, body.conversationId);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@CurrentUser() user: User) {
    return this.chatService.getConversations(user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation with messages' })
  async getConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.getConversation(id, user.id);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Delete a conversation' })
  async deleteConversation(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.chatService.deleteConversation(id, user.id);
  }
}
