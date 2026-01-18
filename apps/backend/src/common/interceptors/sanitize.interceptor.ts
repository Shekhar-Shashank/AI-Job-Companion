import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (request.body) {
      request.body = this.sanitizeObject(request.body);
    }

    return next.handle();
  }

  private sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        // Skip sanitization for password fields
        if (key.toLowerCase().includes('password')) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    return sanitizeHtml(str, this.sanitizeOptions).trim();
  }
}
