import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  };

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') {
      return value;
    }
    return this.sanitizeValue(value);
  }

  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeValue(item));
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.sanitizeValue(value[key]);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(str: string): string {
    // Remove HTML tags and trim whitespace
    return sanitizeHtml(str, this.sanitizeOptions).trim();
  }
}
