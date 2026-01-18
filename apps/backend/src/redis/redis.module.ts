import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');

        // If Redis is configured, use Redis store; otherwise use in-memory
        if (redisHost && redisPort) {
          try {
            const store = await redisStore({
              socket: {
                host: redisHost,
                port: redisPort,
              },
              ttl: 300000, // 5 minutes default in ms
            });
            console.log('Redis cache connected successfully');
            return { store };
          } catch (error) {
            console.warn('Failed to connect to Redis, falling back to in-memory cache:', error);
            return { ttl: 300000 };
          }
        }

        console.log('Using in-memory cache (Redis not configured)');
        return { ttl: 300000 }; // In-memory fallback
      },
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisModule {}
