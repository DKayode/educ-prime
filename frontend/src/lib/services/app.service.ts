import { api } from '../api';

export interface AppBranding {
    name: string;
    logo: string;
    favicon: string;
}

export const appService = {
    /**
     * Public, unauthenticated. Fetch once at app startup; the response
     * doesn't change between deploys. Frontend can then bind <DashboardLayout>
     * header logo, document.title, etc. to runtime config without rebuilding
     * the bundle when the brand changes.
     */
    async get(): Promise<AppBranding> {
        return api.get<AppBranding>('/app');
    },
};
