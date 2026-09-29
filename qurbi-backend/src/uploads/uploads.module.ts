import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadedFile } from '../entities';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { StorageService } from './storage/storage.service';
import { LocalDiskStorageService } from './storage/local-disk-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadedFile])],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    { provide: StorageService, useClass: LocalDiskStorageService },
  ],
})
export class UploadsModule {}
