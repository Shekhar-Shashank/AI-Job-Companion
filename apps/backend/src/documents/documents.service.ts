import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  private uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async findAll(userId: string, documentType?: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
        ...(documentType && { documentType }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id, userId },
      include: { chunks: true },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    return document;
  }

  async create(
    userId: string,
    file: Express.Multer.File,
    documentType?: string,
  ) {
    const filename = `${uuidv4()}${path.extname(file.originalname)}`;
    const storagePath = path.join(this.uploadDir, filename);

    // Save file
    fs.writeFileSync(storagePath, file.buffer);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        userId,
        filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
        documentType,
      },
    });

    // TODO: Trigger async processing (text extraction, chunking, embedding)

    return document;
  }

  async updateProcessingStatus(
    id: string,
    isProcessed: boolean,
    extractedText?: string,
    error?: string,
  ) {
    return this.prisma.document.update({
      where: { id },
      data: {
        isProcessed,
        extractedText,
        processingError: error,
      },
    });
  }

  async remove(id: string, userId: string) {
    const document = await this.findOne(id, userId);

    // Delete file
    if (fs.existsSync(document.storagePath)) {
      fs.unlinkSync(document.storagePath);
    }

    // Delete chunks first (cascade should handle this, but being explicit)
    await this.prisma.documentChunk.deleteMany({
      where: { documentId: id },
    });

    return this.prisma.document.delete({ where: { id } });
  }

  async createChunks(
    documentId: string,
    chunks: { content: string; tokenCount?: number }[],
  ) {
    return this.prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId,
        chunkIndex: index,
        content: chunk.content,
        tokenCount: chunk.tokenCount,
      })),
    });
  }

  async getChunks(documentId: string) {
    return this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }
}
