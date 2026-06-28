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
     * Direct URL for a PUBLIC slot, read straight off the entity row's
     * `<slot>_path` field (which now stores the full anonymous URL). When set,
     * the file renders over a plain GET with no presign round-trip. Leave unset
     * for private slots (epreuves, utilisateurs, prestataires
     * identity) so the component resolves a short-lived presigned URL instead.
     */
    url?: string | null;
    /**
     * Legacy URL to use when neither `url` nor a registered R2 file is
     * available yet. Only set this for entities still in migration; for
     * fully-migrated entities leave it unset and the placeholder renders.
     */
    fallback?: string | null;
    /** Rendered when there's nothing valid to show. */
    placeholder?: React.ReactNode;
}

/**
 * Resolve and render a file from the R2 pipeline.
 *
 * - Public slots: pass the full URL via `url` (read from the entity row's
 *   `<slot>_path` field). It renders over a plain GET — no backend call.
 * - Private slots: omit `url`; the component fetches a short-lived presigned
 *   URL from /files/.../download-url and caches it in TanStack Query.
 *
 * Three failure modes are handled, each falling through to `placeholder`:
 *   1. No URL and no row uuid (entity not loaded yet, or no row in scope).
 *   2. download-url 404 (private slot row exists but no file uploaded yet).
 *   3. <img> onError (URL resolves but the bytes are missing from R2).
 *
 * The optional `fallback` lets pages that haven't been migrated yet point
 * at a legacy URL; fully-migrated entities should omit it so a missing file
 * degrades to the placeholder instead of a noisy legacy 404/400.
 */
export function FileImage({
    entity,
    uuid,
    slot,
    url,
    fallback,
    placeholder,
    alt,
    onError: onErrorProp,
    ...imgProps
}: FileImageProps) {
    // A non-empty `url` means this is a public slot whose URL came straight off
    // the entity row — render it directly and skip the presign request entirely.
    const directUrl = url || null;
    const usePresign = !directUrl && !!uuid;

    const { data, isLoading } = useQuery({
        queryKey: ['file-download-url', entity, uuid, slot],
        queryFn: () => filesService.getDownloadUrl(entity, uuid as string, slot),
        enabled: usePresign,
        // Presigned URLs expire in 5 min; cache for 4 to avoid serving expired
        // URLs while staying well below the wall.
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
    const currentSrc = directUrl ?? data?.url ?? fallback ?? null;
    useEffect(() => {
        setImgFailed(false);
    }, [currentSrc]);

    if (usePresign && isLoading) {
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
