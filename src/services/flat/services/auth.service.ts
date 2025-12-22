import axios from 'axios';
import {
    FlatLoginRequest,
    FlatLoginResponse,
    FlatUser,
    SendVerificationCodeRequest,
    SendVerificationCodeResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateInformationResponse,
    UpdateInformationRequest
} from '../types';
enum Status {
    Success = 0,
    Failed = 1
}

enum ErrorCode {
    UserNotFound = 1001,
    FileUploadFailed = 1002,
    ParamsCheckFailed = 1003
}
export class AuthService {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /**
     * Gửi mã xác nhận đến email
     */
    async sendVerificationCode(email: string): Promise<void> {
        try {
            console.log('Sending verification code to email:', email);
            // console.log('Using baseURL:', this.baseURL);

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
            // console.log('Using baseURL:', this.baseURL);

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
            // console.log('Using baseURL:', this.baseURL);

            const response = await axios.post<FlatLoginResponse>(
                `${this.baseURL}/v2/login/email`,
                credentials,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            console.log(response)
            if (response.data.status !== 0) {
                throw new Error('Login failed, please try again!');
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
            throw new Error(` ${error.response?.data?.message || error.message}`);
        }
    }

    async updateInformation(
        user_uuid: string,
        updates: {
            avatar?: string;
            organization?: string;
            organization_description?: string;
            name?: string; // user_name từ backend
        },
        token: string
    ): Promise<UpdateInformationResponse> {
        try {
            console.log('Updating user information for UUID:', user_uuid);
            console.log('Updates:', updates);
            // console.log('Using baseURL:', this.baseURL);

            // Chuẩn bị request data
            const requestData: UpdateInformationRequest = {
                user_uuid,
                organization: updates.organization,
                organization_description: updates.organization_description,
                logo: updates.avatar
            };

            // Lọc bỏ các trường undefined
            const filteredData: any = {};
            Object.keys(requestData).forEach(key => {
                if (requestData[key as keyof UpdateInformationRequest] !== undefined) {
                    filteredData[key] = requestData[key as keyof UpdateInformationRequest];
                }
            });

            console.log('Sending data:', filteredData);

            const response = await axios.post<UpdateInformationResponse>(
                `${this.baseURL}/v1/user/organization/update-information`,
                filteredData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== Status.Success) {
                throw new Error(`Update failed: ${response.data || 'Unknown error'}`);
            }

            console.log('User information updated successfully:', response.data.data);
            return response.data;

        } catch (error: any) {
            console.error('Error updating user information:', error);
            console.error('Error response:', error.response?.data);

            // Xử lý lỗi cụ thể từ backend
            const errorCode = error.response?.data?.code;
            let errorMessage = `Failed to update information: ${error.response?.data?.message || error.message}`;

            if (errorCode === ErrorCode.UserNotFound) {
                errorMessage = 'User not found';
            } else if (errorCode === ErrorCode.FileUploadFailed) {
                errorMessage = 'Failed to update avatar';
            } else if (errorCode === ErrorCode.ParamsCheckFailed) {
                errorMessage = 'No data to update';
            }

            throw new Error(errorMessage);
        }
    }
}
