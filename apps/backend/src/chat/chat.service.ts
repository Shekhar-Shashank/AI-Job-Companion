import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from './rag.service';
import { AgentService } from './agent.service';
import OpenAI from 'openai';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private ragService: RagService,
    private agentService: AgentService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(
    userId: string,
    message: string,
    conversationId?: string,
  ): Promise<{ response: string; conversationId: string }> {
    // Get or create conversation
    let conversation = conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: message.slice(0, 50),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Build context using RAG
    const context = await this.ragService.buildContext(userId, message);

    // Build message history
    const history: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Generate response
    const systemPrompt = this.buildSystemPrompt(context);
    const response = await this.generateResponse(systemPrompt, history, message);

    // Save assistant message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: response,
        contextUsed: JSON.stringify(context.sources),
      },
    });

    // Update conversation title if first message
    if (conversation.messages.length === 0) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: this.generateTitle(message) },
      });
    }

    return {
      response,
      conversationId: conversation.id,
    };
  }

  async *chatStream(
    userId: string,
    message: string,
    conversationId?: string,
  ): AsyncGenerator<{ type: string; content: any }> {
    // Check OpenAI API key
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      yield { type: 'error', content: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.' };
      return;
    }

    // Get or create conversation
    let conversation = conversationId
      ? await this.prisma.conversation.findFirst({
          where: { id: conversationId, userId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: message.slice(0, 50),
        },
        include: { messages: true },
      });
    }

    yield { type: 'conversation_id', content: conversation.id };

    // Save user message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    // Build context using RAG
    yield { type: 'status', content: 'Building context...' };
    let context;
    try {
      context = await this.ragService.buildContext(userId, message);
    } catch (error) {
      console.error('RAG context error:', error);
      context = { text: 'No profile context available.', sources: [], tokenCount: 0 };
    }
    yield { type: 'context', content: context.sources };

    // Build message history
    const history: ChatMessage[] = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Generate streaming response
    const systemPrompt = this.buildSystemPrompt(context);
    let fullResponse = '';

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: message },
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          yield { type: 'token', content };
        }
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate response';
      yield { type: 'error', content: `OpenAI API error: ${errorMessage}` };
      return;
    }

    // Save assistant message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: fullResponse,
        contextUsed: JSON.stringify(context.sources),
      },
    });

    yield { type: 'done', content: { conversationId: conversation.id } };
  }

  private buildSystemPrompt(context: any): string {
    return `You are a personal career AI assistant with access to the user's data.

CRITICAL RULES:
1. ONLY use information from the provided context
2. If data is not in context, say "I don't have that information in your profile"
3. NEVER invent skills, experiences, companies, or achievements
4. ALWAYS cite which data source information came from
5. Distinguish between "your profile shows X" vs "generally, X is true"
6. If asked to update data, confirm the change before executing
7. When uncertain, ask for clarification rather than guessing

USER CONTEXT:
${context.text}

Remember: You are grounded in the user's actual data. Never hallucinate or make up information.`;
  }

  private async generateResponse(
    systemPrompt: string,
    history: ChatMessage[],
    message: string,
  ): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
    });

    return response.choices[0].message.content || '';
  }

  private generateTitle(message: string): string {
    // Simple title generation - first 50 chars
    const title = message.slice(0, 50);
    return title.length < message.length ? `${title}...` : title;
  }

  // Conversation management
  async getConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getConversation(conversationId: string, userId: string) {
    return this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return null;
    }

    return this.prisma.conversation.delete({
      where: { id: conversationId },
    });
  }
}
