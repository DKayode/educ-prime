import { useQuery } from '@tanstack/react-query';
import { filesService, Slot } from '@/lib/services/files.service';
import { ImageOff } from 'lucide-react';
import { ComponentProps, useEffect, useState } from 'react';

interface FileImageProps extends Omit<ComponentProps<'img'>, 'src'> {
    /** Plural entity table name, e.g. 'categories'. */
    entity: string;
    /** Row uuid; if missing, render the fallback or placeholder. */
    uuid?: string | null;
    /** Slot key registered in backend FILE_FIELD_REGISTRY. */
    slot: Slot;
    /**
     * Legacy URL to use when the new R2 file isn't registered yet. Only set
     * this for entities still in migration; for fully-migrated entities
     * (categories, etablissements) leave it unset and the placeholder will
     * render directly.
     */
    fallback?: string | null;
    /** Rendered when there's nothing valid to show. */
    placeholder?: React.ReactNode;
}

/**
 * Resolve and render a file from the R2 pipeline. Auto-fetches a download
 * URL from /files/.../download-url (presigned for private slots; a
 * deterministic public URL with no expiry for public slots) and caches it
 * in TanStack Query.
 *
 * Three failure modes are handled, each falling through to `placeholder`:
 *   1. No row uuid (entity not loaded yet, or has no row in scope).
 *   2. download-url 404 (row exists but no file registered yet).
 *   3. <img> onError (download-url 200 but the file is missing from R2 —
 *      happens when the bucket sync missed a key, the public bucket
 *      drifted from the private one, etc.).
 *
 * The optional `fallback` lets pages that haven't been migrated yet point
 * at a legacy URL; pages whose entity has been fully migrated to R2 should
 * omit it so a missing file degrades to the placeholder instead of a noisy
 * legacy 404/400.
 */
export function FileImage({
    entity,
    uuid,
    slot,
    fallback,
    placeholder,
    alt,
    onError: onErrorProp,
    ...imgProps
}: FileImageProps) {
    const enabled = !!uuid;

    const { data, isLoading } = useQuery({
        queryKey: ['file-download-url', entity, uuid, slot],
        queryFn: () => filesService.getDownloadUrl(entity, uuid as string, slot),
        enabled,
        // Presigned URLs expire in 5 min; cache for 4 to avoid serving expired
        // URLs while staying well below the wall. Public-slot URLs are stable
        // but reusing the same TTL keeps the cache logic uniform.
        staleTime: 4 * 60 * 1000,
        gcTime: 4 * 60 * 1000,
        retry: 1,
    });

    // Track <img> load failures so a 404 on the actual bytes (R2 object
    // missing) falls through to the placeholder instead of leaving a
    // broken-image icon in the table.
    const [imgFailed, setImgFailed] = useState(false);
    // Reset the error state when the URL we'd render changes — otherwise
    // a recovered upload would never re-attempt.
    const currentSrc = data?.url ?? fallback ?? null;
    useEffect(() => {
        setImgFailed(false);
    }, [currentSrc]);

    if (enabled && isLoading) {
        return <div {...(imgProps as any)} aria-busy="true" />;
    }

    const renderPlaceholder = () => {
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
    };

    if (!currentSrc || imgFailed) return renderPlaceholder();

    return (
        <img
            src={currentSrc}
            alt={alt}
            {...imgProps}
            onError={(e) => {
                setImgFailed(true);
                onErrorProp?.(e);
            }}
        />
    );
}
