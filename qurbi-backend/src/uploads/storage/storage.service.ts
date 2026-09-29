import { UploadVisibility } from '../../entities';

export interface StoredFile {
  // Opaque key the driver needs to locate the file again (e.g. a filename
  // for local disk, an object key for S3).
  storageKey: string;
  // Public URL, only meaningful when visibility is PUBLIC — a static-served
  // path the client can fetch directly. Private files have no direct URL:
  // they're only reachable through UploadsController's authenticated
  // GET /uploads/private/:id route, built from the UploadedFile record id.
  url: string;
}

// Swappable storage backend. UploadsService only ever talks to this
// interface, so moving from local disk to S3 (or anything else) later is a
// new class + a DI binding change, not a rewrite of the upload flow.
export abstract class StorageService {
  abstract save(
    buffer: Buffer,
    extension: string,
    visibility: UploadVisibility,
  ): Promise<StoredFile>;
}
