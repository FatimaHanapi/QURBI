import React, { useRef, useState } from "react";
import { resolveApiAssetUrl, uploadApi } from "@/api/apiClient";
import { Loader2, PlaySquare, Upload, X } from "lucide-react";

const MAX_VIDEOS = 2;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export default function VideoUploader({ value = [], onChange, buttonLabel = "Add livestock video" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (fileList) => {
    setError("");
    const files = Array.from(fileList).slice(0, MAX_VIDEOS - value.length);
    if (!files.length) return;
    const invalid = files.find((file) => !file.type.startsWith("video/") || file.size > MAX_VIDEO_BYTES);
    if (invalid) {
      setError("Use MP4, MOV or WebM videos up to 50 MB each.");
      return;
    }

    setUploading(true);
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const result = await uploadApi.upload(file, "public");
        if (!result.fileUrl) throw new Error("Upload returned no URL");
        return result.fileUrl;
      }));
      onChange([...value, ...urls]);
    } catch (uploadError) {
      setError(uploadError.message || "Video upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value.map((url, index) => (
        <div key={url} className="relative overflow-hidden rounded-2xl border border-border bg-black">
          <video src={resolveApiAssetUrl(url)} controls preload="metadata" className="aspect-video w-full" />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"
            aria-label={`Remove video ${index + 1}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {value.length < MAX_VIDEOS && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex min-h-20 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading video..." : buttonLabel}
        </button>
      )}

      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <PlaySquare className="h-3.5 w-3.5" /> Up to {MAX_VIDEOS} videos, 50 MB each.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        multiple
        className="hidden"
        onChange={(event) => upload(event.target.files)}
      />
    </div>
  );
}
