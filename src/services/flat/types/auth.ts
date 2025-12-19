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
export interface UpdateInformationRequest {
    user_uuid: string;
    organization?: string;
    organization_description?: string;
    logo?: string;
}

export interface UpdateInformationResponse
{
    status: number;
    data: {
        user_uuid: string;
        logo: string;
        organization: string;
        organization_description: string;
    }
}
