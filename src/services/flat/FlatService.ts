import { AuthService } from './services/auth.service';
import { RoomService } from './services/room.service';
import { UserService } from './services/user.service';
import { generateClientKey } from './utils/crypto';
import {
    FlatLoginRequest,
    FlatUser,
    RegisterRequest,
    FlatRoom,
    TotalMinutesResponse,
    RoomParticipantsSummary,
    OrganizationUsersSummary,
    UserInOutRecord,
    UserInOutResponse,
    UserInOutSummary
} from './types';
import {FlatRoomResponse} from "@/services/flat/types";

export class FlatService {
    private baseURL: string;
    public auth: AuthService;
    public room: RoomService;
    public user: UserService;

    constructor() {
        this.baseURL = process.env.NEXT_PUBLIC_FLAT_BACKEND_BASE_URL || 'https://csm-classroom-server.ubion.global';
        console.log('FlatService initialized with baseURL:', this.baseURL);

        // Khởi tạo các service con
        this.auth = new AuthService(this.baseURL);
        this.room = new RoomService(this.baseURL);
        this.user = new UserService(this.baseURL);
    }

    /**
     * Generate client key từ secret key
     */
    public generateClientKey(secretKey: string): string {
        return generateClientKey(secretKey);
    }

    // Các method proxy để giữ backward compatibility

    /**
     * Gửi mã xác nhận đến email
     */
    async sendVerificationCode(email: string): Promise<void> {
        return this.auth.sendVerificationCode(email);
    }

    /**
     * Đăng ký tài khoản mới với email và mã xác nhận
     */
    async register(credentials: RegisterRequest): Promise<FlatUser> {
        return this.auth.register(credentials);
    }

    /**
     * Đăng nhập vào Flat
     */
    async login(credentials: FlatLoginRequest): Promise<FlatUser> {
        return this.auth.login(credentials);
    }

    /**
     * Lấy danh sách phòng của user
     */
    async getUserRooms(token: string, page: number = 1, limit: number = 10) {
        return this.room.getUserRooms(token, page, limit);
    }

    /**
     * Dừng phòng
     */
    async stopRoom(roomUUID: string, token: string) {
        return this.room.stopRoom(roomUUID, token);
    }

    /**
     * Tạo phòng ordinary mới (legacy method)
     */
    async createRoom(roomData: {
        title: string;
        type: 'SmallClass';
        beginTime: number;
        endTime: number;
        email: string;
    }, customer: any): Promise<FlatRoomResponse> {
        return this.room.createRoom(roomData, customer);
    }

    /**
     * Tạo phòng với token
     */
    async createRoomWithToken(token: string) {
        return this.room.createRoomWithToken(token);
    }

    /**
     * Cập nhật phòng với token
     */
    async updateRoomWithToken(token: string) {
        return this.room.updateRoomWithToken(token);
    }

    /**
     * Lấy thông tin chi tiết của phòng
     */
    async getRoomInfo(roomUUID: string, token: string) {
        return this.room.getRoomInfo(roomUUID, token);
    }

    /**
     * Lấy tổng số phút của tất cả các phòng
     */
    async getTotalRoomMinutes(token: string, options?: {
        startDate?: Date;
        endDate?: Date;
        roomStatus?: string;
        page?: number;
        limit?: number;
    }): Promise<TotalMinutesResponse> {
        return this.room.getTotalRoomMinutes(token, options);
    }

    /**
     * Lấy tổng số phút theo tháng (tiện ích)
     */
    async getTotalMinutesThisMonth(token: string): Promise<TotalMinutesResponse> {
        return this.room.getTotalMinutesThisMonth(token);
    }

    /**
     * Lấy tổng số phút theo ngày (tiện ích)
     */
    async getTotalMinutesToday(token: string): Promise<TotalMinutesResponse> {
        return this.room.getTotalMinutesToday(token);
    }

    /**
     * Lấy danh sách participants của một room
     */
    async getRoomParticipants(roomUUID: string, token: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<RoomParticipantsSummary> {
        return this.room.getRoomParticipants(roomUUID, token, options);
    }

    /**
     * Lấy tất cả participants của một room (tự động lấy tất cả trang)
     */
    async getAllRoomParticipants(roomUUID: string, token: string): Promise<RoomParticipantsSummary> {
        return this.room.getAllRoomParticipants(roomUUID, token);
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
        return this.user.getTotalParticipantsForAllRoomUnderOrganization(token, options);
    }

    async getRoomUserInOut(roomUUID: string, token: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<UserInOutSummary> {
        return this.room.getRoomUserInOut(roomUUID, token, options);
    }

    async getAllRoomUserInOut(roomUUID: string, token: string): Promise<UserInOutSummary> {
        return this.room.getAllRoomUserInOut(roomUUID, token);
    }

    async getUserInOutSummary(roomUUID: string, token: string) {
        return this.room.getUserInOutSummary(roomUUID, token);
    }

    async getUserInOutAnalysis(roomUUID: string, token: string) {
        return this.room.getUserInOutAnalysis(roomUUID, token);
    }
}
