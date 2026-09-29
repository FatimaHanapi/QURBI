import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { join } from 'path';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PRIVATE_UPLOADS_DIR } from './storage/local-disk-storage.service';
import { MAX_UPLOAD_BYTES, UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // `visibility` is a plain multipart text field alongside `file` — "public"
  // for listing photos/videos, anything else (including absent) is treated
  // as private. Fail closed: an unrecognized value never becomes public.
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      // Buffer in memory, not disk — StorageService takes it from there, so
      // swapping the backend (e.g. to S3) never touches this interceptor.
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
    @Body('visibility') visibility: unknown,
  ) {
    return this.uploadsService.upload(file, user.id, visibility);
  }

  // The only way to read a private upload back. Bypasses Nest's JSON
  // response handling to stream the file directly, same as static serving
  // would for a public one — the difference is everything before this line:
  // ownership is checked first.
  @Get('private/:id')
  async getPrivate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.uploadsService.getPrivateFileForViewer(id, user);
    res.setHeader('Content-Type', file.mimeType);
    res.sendFile(join(PRIVATE_UPLOADS_DIR, file.storageKey));
  }
}
