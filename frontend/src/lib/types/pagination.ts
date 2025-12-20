// Pagination types for API responses
export interface PaginationResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
}

/**
 * Build query string from pagination parameters
 * @param params Pagination parameters
 * @returns Query string (e.g., "?page=1&limit=10")
 */
export function buildPaginationQuery(params?: PaginationParams): string {
    if (!params) return '';

    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
        const value = (params as any)[key];
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value.toString());
        }
    });

    const query = queryParams.toString();
    return query ? `?${query}` : '';
}
