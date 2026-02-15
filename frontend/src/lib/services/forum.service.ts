import { api } from '../api';
import type { Forum, ForumCommentaire, CreateForumCommentaire } from '../types';

export interface PaginationResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const forumService = {
    getAll: async (query?: string, sortBy?: 'most_liked' | 'most_commented', page = 1, limit = 10): Promise<PaginationResponse<Forum>> => {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (sortBy) params.append('sortBy', sortBy);
        params.append('page', page.toString());
        params.append('limit', limit.toString());

        return api.get<PaginationResponse<Forum>>(`/forums?${params.toString()}`);
    },

    getOne: async (id: number): Promise<Forum> => {
        return api.get<Forum>(`/forums/${id}`);
    },

    create: async (data: Partial<Forum>): Promise<Forum> => {
        return api.post<Forum>('/forums', data);
    },

    delete: async (id: number): Promise<void> => {
        return api.delete(`/forums/${id}`);
    },

    getComments: async (forumId: number, page = 1, limit = 10): Promise<PaginationResponse<any>> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        return api.get<PaginationResponse<any>>(`/commentaires/Forums/${forumId}?${params.toString()}`);
    },

    createComment: async (data: CreateForumCommentaire): Promise<ForumCommentaire> => {
        return api.post<ForumCommentaire>(`/commentaires/Forums/${data.forum_id}`, {
            content: data.content,
            commentaire_id: data.commentaire_id
        });
    },

    toggleLike: async (model: 'Forums' | 'Commentaires', id: number): Promise<{ status: 'liked' | 'unliked', model: string, id: number }> => {
        return api.post<{ status: 'liked' | 'unliked', model: string, id: number }>(`/likes/${model}/${id}`, {});
    },

    uploadPhoto: async (id: number, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/forums/${id}/photo`, formData);
    },

    getPhoto: async (id: number): Promise<Blob> => {
        return api.download(`/forums/${id}/photo`);
    }
};
