import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { UploadVisibility } from '../../entities';
import { StorageService, StoredFile } from './storage.service';

// Project-root /uploads, split into two subdirectories:
//  - public/  — served statically (see main.ts's useStaticAssets), for
//    listing photos/videos.
//  - private/ — NOT statically served. Verification documents live here;
//    the only way to read one back is UploadsController's authenticated
//    GET /uploads/private/:id route. This is a structural guarantee, not
//    just an unlisted URL: the static middleware's root doesn't even cover
//    this directory, so there's no path that reaches it unauthenticated.
export const UPLOADS_ROOT = join(process.cwd(), 'uploads');
export const PUBLIC_UPLOADS_DIR = join(UPLOADS_ROOT, 'public');
export const PRIVATE_UPLOADS_DIR = join(UPLOADS_ROOT, 'private');

@Injectable()
export class LocalDiskStorageService extends StorageService {
  async save(
    buffer: Buffer,
    extension: string,
    visibility: UploadVisibility,
  ): Promise<StoredFile> {
    const dir =
      visibility === UploadVisibility.PUBLIC
        ? PUBLIC_UPLOADS_DIR
        : PRIVATE_UPLOADS_DIR;
    await mkdir(dir, { recursive: true });

    // The filename is entirely server-generated — never the client's
    // original filename, and never interpolated into a path. A UUID can't
    // contain "..", "/", or anything else that could escape `dir`.
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(dir, filename), buffer);

    return {
      storageKey: filename,
      url:
        visibility === UploadVisibility.PUBLIC
          ? `/uploads/public/${filename}`
          : '',
    };
  }
}
