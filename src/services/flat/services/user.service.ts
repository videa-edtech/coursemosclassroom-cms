import axios from 'axios';
import {
    OrganizationUsersResponse,
    OrganizationUsersSummary
} from '../types';

export class UserService {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /**
     * Lấy tổng số participants của nhiều rooms
     */
    async getTotalParticipantsForAllRoomUnderOrganization(
        token: string,
        options?: {
            page?: number;
            limit?: number;
        }
    ): Promise<OrganizationUsersSummary> {
        try {
            console.log('Fetching organization users');
            // console.log('Using baseURL:', this.baseURL);

            const page = options?.page || 1;
            const limit = options?.limit || 10;

            const response = await axios.get<OrganizationUsersResponse>(
                `${this.baseURL}/v1/user/organization/list-user`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    params: {
                        page,
                        limit
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to fetch organization users');
            }

            console.log('Organization users fetched successfully:', {
                total: response.data.data.total,
                usersCount: response.data.data.list.length,
                page: response.data.data.page,
                limit: response.data.data.limit
            });

            return {
                totalUsers: response.data.data.total,
                users: response.data.data.list,
                page: response.data.data.page,
                limit: response.data.data.limit
            };

        } catch (error: any) {
            console.error('Error fetching organization users:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch organization users: ${error.response?.data?.message || error.message}`);
        }
    }
}
