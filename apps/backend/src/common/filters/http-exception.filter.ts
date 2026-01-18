import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AuthenticatedRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Extract validation errors if it's a BadRequestException
    let validationErrors: any = null;
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, any>;
        if (resp.message) {
          message = resp.message;
          validationErrors = resp.message;
        }
      }
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log the error with context
    this.logger.error(`${request.method} ${request.url}`, {
      status,
      message,
      validationErrors,
      stack: exception instanceof Error ? exception.stack : undefined,
      userId: request.user?.id,
      body: this.sanitizeBody(request.body),
      query: request.query,
    });

    response.status(status).json(errorResponse);
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    // Remove sensitive fields from logs
    const sensitiveFields = ['password', 'passwordHash', 'token', 'accessToken'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
