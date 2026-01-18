import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const isProduction = process.env.NODE_ENV === 'production';

// Create logs directory path
const logsDir = 'logs';

export const winstonConfig = WinstonModule.createLogger({
  transports: [
    // Console transport - always enabled
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        isProduction
          ? winston.format.json()
          : utilities.format.nestLike('API', {
              colors: true,
              prettyPrint: true,
            }),
      ),
    }),
    // Error log file with daily rotation
    new winston.transports.DailyRotateFile({
      filename: `${logsDir}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    // Combined log file with daily rotation
    new winston.transports.DailyRotateFile({
      filename: `${logsDir}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});
