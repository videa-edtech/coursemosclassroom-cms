import axios from 'axios';
import crypto from 'crypto';

export interface CreateOrdinaryRoomRequest {
    title: string;
    type: 'SmallClass';
    beginTime: number;
    endTime: number;
    pmi: boolean;
    region: string;
    email: string;
    clientKey: string;
}

export interface CreateOrdinaryRoomResponse {
    roomUUID: string;
    roomId: number;
    roomOriginId: string;
    inviteCode: string;
    joinUrl: string;
    createdAt: number;
}

export interface FlatRoom {
    roomUUID: string;
    roomId: number;
    joinUrl: string;
    createdAt: number;
}

export class FlatService {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.FLAT_BACKEND_BASE_URL;
    }

    /**
     * Generate client key từ secret key
     */
    public generateClientKey(secretKey: string): string {
        return crypto
            .createHash('md5')
            .update(secretKey + 'test')
            .digest('hex');
    }

    /**
     * Tạo phòng ordinary mới
     */
    async createRoom(roomData: {
        title: string;
        type: 'SmallClass';
        beginTime: number;
        endTime: number;
        email: string;
    }, customer: any): Promise<FlatRoom> {
        try {
            // Tạo clientKey từ secret_key của customer
            const clientKey = this.generateClientKey(customer.secret_key);

            const requestData: CreateOrdinaryRoomRequest = {
                title: roomData.title,
                type: roomData.type,
                beginTime: roomData.beginTime,
                endTime: roomData.endTime,
                pmi: false,
                region: 'cn-hz',
                email: roomData.email,
                clientKey: clientKey
            };

            console.log('Creating Flat.io room with data:', requestData);

            const response = await axios.post(
                `${this.baseURL}/v1/room/create/ordinary-by-user`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            console.log('Flat.io room created successfully:', response.data);

            return {
                roomUUID: response.data.data.roomUUID,
                joinUrl: process.env.FLAT_CMS_BASE_URL + '/join/'+response.data.data.roomUUID,
            };

        } catch (error: any) {
            console.error('Error creating Flat.io room:', error);
            console.error('Request data:', roomData);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to create Flat.io room: ${error.response?.data?.message || error.message}`);
        }
    }
}

// Export singleton instance
export const flatService = new FlatService();
