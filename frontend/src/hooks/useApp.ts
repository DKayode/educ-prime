import { useQuery } from '@tanstack/react-query';
import { appService, AppBranding } from '@/lib/services/app.service';

/**
 * Cache the /app response process-wide. Brand config changes are rare —
 * once an hour is plenty fresh. gcTime: Infinity keeps the entry around
 * even if every consumer unmounts, so re-mount doesn't trigger a refetch.
 */
export function useApp() {
    return useQuery<AppBranding>({
        queryKey: ['app'],
        queryFn: () => appService.get(),
        staleTime: 60 * 60 * 1000,
        gcTime: Infinity,
        retry: 1,
    });
}
