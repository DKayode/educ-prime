import { useQuery } from '@tanstack/react-query';
import { filesService, Slot } from '@/lib/services/files.service';
import { ImageOff } from 'lucide-react';
import { ComponentProps } from 'react';

interface FileImageProps extends Omit<ComponentProps<'img'>, 'src'> {
    /** Plural entity table name, e.g. 'categories'. */
    entity: string;
    /** Row uuid; if missing, render the fallback or placeholder. */
    uuid?: string | null;
    /** Slot key registered in backend FILE_FIELD_REGISTRY. */
    slot: Slot;
    /**
     * Legacy Firebase URL to use when the new R2 file isn't registered yet
     * (rows that haven't been migrated, or new rows created before the
     * migration finishes). Fallback is rendered as `<img src={fallback}>`
     * unchanged.
     */
    fallback?: string | null;
    /** Render this instead of broken-image when there's nothing to show. */
    placeholder?: React.ReactNode;
}

/**
 * Resolve and render a file from the new R2 pipeline. Auto-fetches a
 * presigned download URL from /files/.../download-url and caches it in
 * TanStack Query (keyed by entity+uuid+slot). The presigned URL is short-
 * lived (5 min) but the cache TTL keeps useless re-fetches off the wire.
 *
 * Falls back to the legacy Firebase URL when the new path isn't registered
 * yet — this lets us migrate page-by-page without breaking pre-migration
 * rows.
 */
export function FileImage({ entity, uuid, slot, fallback, placeholder, alt, ...imgProps }: FileImageProps) {
    const enabled = !!uuid;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['file-download-url', entity, uuid, slot],
        queryFn: () => filesService.getDownloadUrl(entity, uuid as string, slot),
        enabled,
        // Presigned URLs expire in 5 min; cache for 4 to avoid serving expired
        // URLs while staying well below the wall.
        staleTime: 4 * 60 * 1000,
        gcTime: 4 * 60 * 1000,
        retry: 1,
    });

    if (enabled && isLoading) {
        return <div {...(imgProps as any)} aria-busy="true" />;
    }

    const r2Url = data?.url ?? null;
    const src = r2Url ?? fallback ?? null;

    if (!src) {
        if (placeholder) return <>{placeholder}</>;
        return (
            <div
                {...(imgProps as any)}
                className={`${imgProps.className ?? ''} flex items-center justify-center bg-muted text-muted-foreground`}
                role="img"
                aria-label={alt ?? 'no file'}
            >
                <ImageOff className="h-6 w-6" />
            </div>
        );
    }

    return <img src={src} alt={alt} {...imgProps} />;
}
