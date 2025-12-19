export interface OrganizationUser {
    id: string;
    created_at: string;
    updated_at: string;
    version: number;
    user_uuid: string;
    user_name: string;
    user_password: string;
    avatar_url: string;
    client_key: string;
    gender: string;
    is_delete: number;
    parent_uuid: string;
}

export interface OrganizationUsersResponse {
    status: number;
    data: {
        total: number;
        list: OrganizationUser[];
        page: number;
        limit: number;
    };
}

export interface OrganizationUsersSummary {
    totalUsers: number;
    users: OrganizationUser[];
    page: number;
    limit: number;
}
export interface OrganizationProfileUpdate {
    name?: string;
    avatar_url?: string;
    organization?: string;
    organization_description?: string;
}
