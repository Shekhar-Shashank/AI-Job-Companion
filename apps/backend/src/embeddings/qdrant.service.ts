import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, any>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, any>;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private readonly vectorSize = 1536; // OpenAI text-embedding-3-small dimension
  private isConnected = false;

  readonly collections = {
    personalProfile: 'personal_profile',
    jobs: 'jobs',
    documents: 'documents',
  };

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('QDRANT_URL') || 'http://localhost:6333';
    this.client = new QdrantClient({ url });
  }

  async onModuleInit() {
    await this.ensureCollections();
  }

  private async ensureCollections() {
    try {
      for (const collection of Object.values(this.collections)) {
        try {
          await this.client.getCollection(collection);
        } catch (error: any) {
          if (error?.status === 404 || error?.message?.includes('Not found')) {
            // Collection doesn't exist, create it
            await this.client.createCollection(collection, {
              vectors: {
                size: this.vectorSize,
                distance: 'Cosine',
              },
            });
            console.log(`Created Qdrant collection: ${collection}`);
          } else {
            throw error;
          }
        }
      }
      this.isConnected = true;
      console.log('Qdrant connected successfully');
    } catch (error) {
      console.warn('Qdrant not available. Vector search features will be disabled.');
      console.warn('Start Qdrant with: docker-compose up -d');
      this.isConnected = false;
    }
  }

  private checkConnection(): void {
    if (!this.isConnected) {
      throw new Error('Qdrant is not connected. Start Qdrant and restart the server.');
    }
  }

  async upsert(
    collectionName: string,
    points: VectorPoint[],
  ): Promise<void> {
    if (!this.isConnected) {
      console.warn('Qdrant not connected, skipping upsert');
      return;
    }
    await this.client.upsert(collectionName, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async search(
    collectionName: string,
    vector: number[],
    limit: number = 10,
    filter?: any,
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      console.warn('Qdrant not connected, returning empty results');
      return [];
    }
    const results = await this.client.search(collectionName, {
      vector,
      limit,
      filter,
      with_payload: true,
    });

    return results.map((r) => ({
      id: r.id as string,
      score: r.score,
      payload: r.payload as Record<string, any>,
    }));
  }

  async delete(collectionName: string, ids: string[]): Promise<void> {
    if (!this.isConnected) return;
    await this.client.delete(collectionName, {
      wait: true,
      points: ids,
    });
  }

  async deleteByFilter(
    collectionName: string,
    filter: any,
  ): Promise<void> {
    if (!this.isConnected) return;
    await this.client.delete(collectionName, {
      wait: true,
      filter,
    });
  }

  // Convenience methods for specific collections
  async upsertProfile(points: VectorPoint[]): Promise<void> {
    await this.upsert(this.collections.personalProfile, points);
  }

  async searchProfile(
    vector: number[],
    userId: string,
    limit: number = 10,
    entityType?: string,
  ): Promise<SearchResult[]> {
    const filter: any = {
      must: [{ key: 'user_id', match: { value: userId } }],
    };

    if (entityType) {
      filter.must.push({ key: 'entity_type', match: { value: entityType } });
    }

    return this.search(this.collections.personalProfile, vector, limit, filter);
  }

  async upsertJobs(points: VectorPoint[]): Promise<void> {
    await this.upsert(this.collections.jobs, points);
  }

  async searchJobs(
    vector: number[],
    limit: number = 20,
    filter?: any,
  ): Promise<SearchResult[]> {
    return this.search(this.collections.jobs, vector, limit, filter);
  }

  async upsertDocuments(points: VectorPoint[]): Promise<void> {
    await this.upsert(this.collections.documents, points);
  }

  async searchDocuments(
    vector: number[],
    userId: string,
    limit: number = 10,
    documentType?: string,
  ): Promise<SearchResult[]> {
    const filter: any = {
      must: [{ key: 'user_id', match: { value: userId } }],
    };

    if (documentType) {
      filter.must.push({ key: 'document_type', match: { value: documentType } });
    }

    return this.search(this.collections.documents, vector, limit, filter);
  }

  // Delete user's data from all collections
  async deleteUserData(userId: string): Promise<void> {
    const filter = {
      must: [{ key: 'user_id', match: { value: userId } }],
    };

    await Promise.all([
      this.deleteByFilter(this.collections.personalProfile, filter),
      this.deleteByFilter(this.collections.documents, filter),
    ]);
  }
}
