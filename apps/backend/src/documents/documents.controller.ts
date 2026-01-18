import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  async findAll(
    @CurrentUser() user: User,
    @Query('type') documentType?: string,
  ) {
    return this.documentsService.findAll(user.id, documentType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by id' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.findOne(id, user.id);
  }

  @Post('upload')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 uploads per minute
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @Query('type') documentType?: string,
  ) {
    // Validate file type by extension
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
    }
    console.log('Uploading file:', file.originalname, 'Size:', file.size, 'Type:', documentType);
    return this.documentsService.create(user.id, file, documentType);
  }

  @Get(':id/chunks')
  @ApiOperation({ summary: 'Get document chunks' })
  async getChunks(@Param('id') id: string, @CurrentUser() user: User) {
    await this.documentsService.findOne(id, user.id); // Verify ownership
    return this.documentsService.getChunks(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.documentsService.remove(id, user.id);
  }
}
