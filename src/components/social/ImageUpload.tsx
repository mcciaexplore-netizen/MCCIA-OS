import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImageIcon, Upload, X } from 'lucide-react';
import { TextInput } from '@/components/form/fields';
import { cn } from '@/utils/cn';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
/** Google Sheets caps a cell at ~50k chars; keep inline images well under it. */
const MAX_INLINE_CHARS = 48_000;

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Drag-and-drop / click image uploader. Small images are encoded to a base64
 * data URI; larger ones should be linked from Google Drive (URL field below).
 */
export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const isDataUri = value.startsWith('data:');

  const handleFile = (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Use a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be under 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      if (result.length > MAX_INLINE_CHARS) {
        toast.error('Image is too large to store inline — paste a Google Drive link instead');
        return;
      }
      onChange(result);
    };
    reader.onerror = () => toast.error('Could not read that image');
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <img src={value} alt="Creative" className="max-h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Remove image"
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors',
            dragOver
              ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-900/20'
              : 'border-slate-300 hover:border-brand-300 dark:border-slate-700'
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Upload className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Drag &amp; drop or click to upload
          </span>
          <span className="text-xs text-slate-400">JPG, PNG, or WebP · up to 5MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <TextInput
          type="url"
          placeholder="or paste an image / Google Drive link"
          value={isDataUri ? '' : value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-400">
        Small images are stored inline in the sheet. For anything larger, paste a Google Drive link.
      </p>
    </div>
  );
}
