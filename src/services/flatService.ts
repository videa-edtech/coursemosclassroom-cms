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
export interface FlatLoginRequest {
    email: string;
    password: string;
}

export interface FlatLoginResponse {
    status: number;
    data: {
        name: string;
        avatar: string;
        userUUID: string;
        token: string;
        hasPhone: boolean;
        hasPassword: boolean;
        isAnonymous: boolean;
        clientKey: string;
    };
}

export interface FlatUser {
    name: string;
    avatar: string;
    userUUID: string;
    token: string;
    hasPhone: boolean;
    hasPassword: boolean;
    isAnonymous: boolean;
    clientKey: string;
    email: string;
}
export interface SendVerificationCodeRequest {
    email: string;
    lang: string;
}

export interface SendVerificationCodeResponse {
    status: number;
    data: {};
}

export interface RegisterRequest {
    email: string;
    password: string;
    code: string;
}

export interface RegisterResponse {
    status: number;
    data: {
        name: string;
        avatar: string;
        userUUID: string;
        token: string;
        hasPhone: boolean;
        hasPassword: boolean;
        isAnonymous: boolean;
    };
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
     * Gửi mã xác nhận đến email
     */
    async sendVerificationCode(email: string): Promise<void> {
        try {
            console.log('Sending verification code to email:', email);

            const requestData: SendVerificationCodeRequest = {
                email: email,
                lang: 'en'
            };

            const response = await axios.post<SendVerificationCodeResponse>(
                `${this.baseURL}/v2/register/email/send-message`,
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to send verification code');
            }

            console.log('Verification code sent successfully to:', email);

        } catch (error: any) {
            console.error('Error sending verification code:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to send verification code: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Đăng ký tài khoản mới với email và mã xác nhận
     */
    async register(credentials: RegisterRequest): Promise<FlatUser> {
        try {
            console.log('Registering new user with email:', credentials.email);

            const response = await axios.post<RegisterResponse>(
                `${this.baseURL}/v2/register/email`,
                credentials,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Registration failed');
            }

            console.log('Flat.io registration successful, Response:', response.data.data);
            console.log('User UUID:', response.data.data.userUUID);
            console.log('Token:', response.data.data.token);

            return {
                ...response.data.data,
                clientKey: '', // Registration response không có clientKey
                email: credentials.email
            };

        } catch (error: any) {
            console.error('Error registering to Flat.io:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to register to Flat.io: ${error.response?.data?.message || error.message}`);
        }
    }
    /**
     * Đăng nhập vào Flat
     */
    async login(credentials: FlatLoginRequest): Promise<FlatUser> {
        try {
            console.log('Logging into Flat.io with email:', credentials.email);

            const response = await axios.post<FlatLoginResponse>(
                `${this.baseURL}/v2/login/email`,
                credentials,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Login failed');
            }

            console.log('Flat.io login successful, Response:', response.data.data);
            console.log('User UUID:', response.data.data.userUUID);
            console.log('Token:', response.data.data.token);
            console.log('Client Key:', response.data.data.clientKey);

            return {
                ...response.data.data,
                email: credentials.email
            };

        } catch (error: any) {
            console.error('Error logging into Flat.io:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to login to Flat.io: ${error.response?.data?.message || error.message}`);
        }
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
