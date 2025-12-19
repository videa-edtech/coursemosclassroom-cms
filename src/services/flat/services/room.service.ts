import axios from 'axios';
import {
    FlatRoom,
    FlatRoomResponse,
    StopRoomRequest,
    StopRoomResponse,
    RoomListResponse,
    RoomInfoResponse,
    TotalMinutesResponse,
    RoomInfoRequest,
    RoomParticipantsRequest,
    RoomParticipantsResponse,
    RoomParticipantsSummary,
    RoomItem,
    UserInOutRecord,
    UserInOutResponse,
    UserInOutSummary
} from '../types';
import { generateClientKey } from '../utils/crypto';
import {RoomParticipant} from "@/services/flat/types";

export class RoomService {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    /**
     * Lấy danh sách phòng của user
     */
    async getUserRooms(token: string, page: number = 1, limit: number = 10): Promise<RoomListResponse['data']> {
        try {
            console.log('Fetching user rooms with token:', token.substring(0, 20) + '...');

            const response = await axios.get<RoomListResponse>(
                `${this.baseURL}/v1/user/organization/list-room`,
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
                throw new Error('Failed to fetch rooms');
            }

            console.log('User rooms fetched successfully:', response.data.data);

            return response.data.data;

        } catch (error: any) {
            console.error('Error fetching user rooms:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch user rooms: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Dừng phòng
     */
    async stopRoom(roomUUID: string, token: string): Promise<StopRoomResponse['data']> {
        try {
            console.log('Stopping room:', roomUUID);
            console.log('Using baseURL:', this.baseURL);

            const requestData: StopRoomRequest = {
                roomUUID: roomUUID,
            };

            const response = await axios.post<StopRoomResponse>(
                `${this.baseURL}/v1/user/organization/room/update-status/stopped`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to stop room');
            }

            console.log('Room stopped successfully:', response.data.data);

            return response.data.data;

        } catch (error: any) {
            console.error('Error stopping room:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to stop room: ${error.response?.data?.message || error.message}`);
        }
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
        try {
            const publicUrl = process.env.NEXT_PUBLIC_URL || 'localhost:3000';
            // Tạo clientKey từ secret_key của customer
            const clientKey = generateClientKey(customer.secret_key ?? customer.flatUser.clientKey);

            const tokenResponse = await fetch(`${publicUrl}/data-token/create-room-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...roomData,
                    clientKey
                }),
            });

            if (!tokenResponse.ok) {
                throw new Error('Failed to generate token');
            }

            const { token } = await tokenResponse.json();

            // Gọi API tạo phòng với token
            const result = await this.createRoomWithToken(token);
            if (result.status === 0) {
                const flatRoom = {
                    status: 0,
                    data: {
                        roomUUID: result.data.roomUUID,
                        joinUrl: `${process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL}/join/${result.data.roomUUID}`,
                        inviteCode: result.data.inviteCode
                    }

                };

                return flatRoom;

            } else {
                throw new Error(JSON.stringify(result) || 'Failed to create room');
            }

        } catch (error: any) {
            throw new Error(`Failed to create room: ${error.message}`);
        }
    }

    /**
     * Tạo phòng với token
     */
    async createRoomWithToken(token: string): Promise<FlatRoomResponse> {
        const response = await fetch(`${this.baseURL}/v1/room/create/ordinary-by-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });
        return response.json();
    }

    /**
     * Cập nhật phòng với token
     */
    async updateRoomWithToken(token: string): Promise<FlatRoomResponse> {
        const response = await fetch(`${this.baseURL}/v1/user/organization/room/update/ordinary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
        });
        return response.json();
    }

    /**
     * Lấy thông tin chi tiết của phòng
     */
    async getRoomInfo(roomUUID: string, token: string): Promise<RoomInfoResponse['data']> {
        try {
            console.log('Fetching room info for roomUUID:', roomUUID);
            console.log('Using baseURL:', this.baseURL);

            const requestData: RoomInfoRequest = {
                roomUUID: roomUUID,
            };

            const response = await axios.post<RoomInfoResponse>(
                `${this.baseURL}/v1/user/organization/room/info/ordinary`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to fetch room info');
            }

            console.log('Room info fetched successfully:', response.data.data);

            return response.data.data;

        } catch (error: any) {
            console.error('Error fetching room info:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch room info: ${error.response?.data?.message || error.message}`);
        }
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
        try {
            console.log('Calculating total room minutes');

            const {
                startDate,
                endDate,
                roomStatus,
                page = 1,
                limit = 50
            } = options || {};

            // Lấy tất cả các phòng
            const allRooms: RoomItem[] = [];
            let currentPage = page;
            let hasMore = true;

            // Lặp qua tất cả các trang để lấy toàn bộ phòng
            while (hasMore) {
                console.log(`Fetching rooms page ${currentPage}`);

                const roomsData = await this.getUserRooms(token, currentPage, limit);

                if (roomsData.list.length === 0) {
                    hasMore = false;
                    break;
                }

                allRooms.push(...roomsData.list);

                // Kiểm tra nếu đã lấy hết tất cả phòng
                if (allRooms.length >= roomsData.total || roomsData.list.length < limit) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            console.log(`Total rooms fetched: ${allRooms.length}`);

            // Lọc phòng theo điều kiện (nếu có)
            let filteredRooms = allRooms;

            if (startDate) {
                filteredRooms = filteredRooms.filter(room =>
                    new Date(room.begin_time) >= startDate
                );
            }

            if (endDate) {
                filteredRooms = filteredRooms.filter(room =>
                    new Date(room.begin_time) <= endDate
                );
            }

            if (roomStatus) {
                filteredRooms = filteredRooms.filter(room =>
                    room.room_status === roomStatus
                );
            }

            // Tính toán tổng số phút và thu thập thông tin chi tiết
            let totalMinutes = 0;
            const roomsWithDetails: TotalMinutesResponse['rooms'] = [];

            for (const room of filteredRooms) {
                try {
                    // Lấy thông tin chi tiết của từng phòng để có beginTime và endTime chính xác
                    const roomInfo = await this.getRoomInfo(room.room_uuid, token);

                    const beginTime = roomInfo.roomInfo.beginTime;
                    const endTime = roomInfo.roomInfo.endTime;

                    // Tính số phút (chuyển từ milliseconds sang phút)
                    const duration = Math.max(0, Math.round((endTime - beginTime) / (1000 * 60)));

                    totalMinutes += duration;

                    roomsWithDetails.push({
                        roomUUID: room.room_uuid,
                        title: roomInfo.roomInfo.title,
                        duration: duration,
                        beginTime: beginTime,
                        endTime: endTime,
                        roomStatus: roomInfo.roomInfo.roomStatus
                    });

                    console.log(`Room "${roomInfo.roomInfo.title}": ${duration} minutes`);

                } catch (error) {
                    console.error(`Error processing room ${room.room_uuid}:`, error);
                    // Vẫn tính toán dựa trên thông tin cơ bản nếu không lấy được chi tiết
                    if (room.begin_time && room.end_time) {
                        const beginTime = new Date(room.begin_time).getTime();
                        const endTime = new Date(room.end_time).getTime();
                        const duration = Math.max(0, Math.round((endTime - beginTime) / (1000 * 60)));

                        totalMinutes += duration;

                        roomsWithDetails.push({
                            roomUUID: room.room_uuid,
                            title: room.title,
                            duration: duration,
                            beginTime: beginTime,
                            endTime: endTime,
                            roomStatus: room.room_status
                        });
                    }
                }
            }

            const result: TotalMinutesResponse = {
                totalMinutes: totalMinutes,
                totalRooms: filteredRooms.length,
                rooms: roomsWithDetails
            };

            console.log(`Total minutes calculated: ${totalMinutes} minutes across ${filteredRooms.length} rooms`);

            return result;

        } catch (error: any) {
            console.error('Error calculating total room minutes:', error);
            throw new Error(`Failed to calculate total room minutes: ${error.message}`);
        }
    }

    /**
     * Lấy tổng số phút theo tháng (tiện ích)
     */
    async getTotalMinutesThisMonth(token: string): Promise<TotalMinutesResponse> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        return this.getTotalRoomMinutes(token, {
            startDate: startOfMonth,
            endDate: endOfMonth
        });
    }

    /**
     * Lấy tổng số phút theo ngày (tiện ích)
     */
    async getTotalMinutesToday(token: string): Promise<TotalMinutesResponse> {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        return this.getTotalRoomMinutes(token, {
            startDate: startOfDay,
            endDate: endOfDay
        });
    }

    /**
     * Lấy danh sách participants của một room
     */
    async getRoomParticipants(roomUUID: string, token: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<RoomParticipantsSummary> {
        try {
            console.log('Fetching room participants for roomUUID:', roomUUID);

            const requestData: RoomParticipantsRequest = {
                room_uuid: roomUUID,
                page: options?.page || 1,
                limit: options?.limit || 50
            };

            const response = await axios.post<RoomParticipantsResponse>(
                `${this.baseURL}/v1/user/organization/room/list-user`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to fetch room participants');
            }

            console.log('Room participants fetched successfully:', {
                total: response.data.data.total,
                participantsCount: response.data.data.list.length,
                roomTitle: response.data.data.list[0]?.room_title || 'Unknown'
            });

            return {
                totalParticipants: response.data.data.total,
                participants: response.data.data.list,
                roomTitle: response.data.data.list[0]?.room_title || 'Unknown Room'
            };

        } catch (error: any) {
            console.error('Error fetching room participants:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch room participants: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Lấy tất cả participants của một room (tự động lấy tất cả trang)
     */
    async getAllRoomParticipants(roomUUID: string, token: string): Promise<RoomParticipantsSummary> {
        try {
            console.log('Fetching all participants for roomUUID:', roomUUID);

            const allParticipants: RoomParticipant[] = [];
            let currentPage = 1;
            const limit = 50;
            let hasMore = true;
            let roomTitle = '';

            while (hasMore) {
                console.log(`Fetching participants page ${currentPage} for room ${roomUUID}`);

                const response = await this.getRoomParticipants(roomUUID, token, {
                    page: currentPage,
                    limit: limit
                });

                // Lưu room title từ page đầu tiên
                if (currentPage === 1) {
                    roomTitle = response.roomTitle;
                }

                allParticipants.push(...response.participants);

                // Kiểm tra nếu đã lấy hết tất cả participants
                if (allParticipants.length >= response.totalParticipants || response.participants.length < limit) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            console.log(`Fetched all ${allParticipants.length} participants for room "${roomTitle}"`);

            return {
                totalParticipants: allParticipants.length,
                participants: allParticipants,
                roomTitle: roomTitle
            };

        } catch (error: any) {
            console.error('Error fetching all room participants:', error);
            throw new Error(`Failed to fetch all room participants: ${error.message}`);
        }
    }

    /**
     * Lấy thông tin user in-out của một phòng
     * Path: v1/user/organization/room/time-in-out-by-user
     */
    async getRoomUserInOut(roomUUID: string, token: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<UserInOutSummary> {
        try {
            console.log('Fetching user in-out records for roomUUID:', roomUUID);
            console.log('Using baseURL:', this.baseURL);

            // Lưu ý: API này dùng POST method với body param
            const response = await axios.post<UserInOutResponse>(
                `${this.baseURL}/v1/user/organization/room/time-in-out-by-user`,
                {
                    room_uuid: roomUUID,
                    page: options?.page || 1,
                    limit: options?.limit || 50
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to fetch user in-out records');
            }

            console.log('User in-out records fetched successfully:', {
                recordsCount: response.data.data.length
            });

            // Kiểm tra nếu có dữ liệu để lấy roomTitle
            const roomTitle = response.data.data.length > 0
                ? response.data.data[0].room_title
                : 'Unknown Room';

            return {
                totalRecords: response.data.data.length,
                records: response.data.data,
                roomUUID: roomUUID,
                roomTitle: roomTitle
            };

        } catch (error: any) {
            console.error('Error fetching user in-out records:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch user in-out records: ${error.response?.data?.message || error.message}`);
        }
    }

    async getRoomUserInOutByToken(roomUUID: string, token: string, options?: {
        page?: number;
        limit?: number;
    }): Promise<UserInOutSummary> {
        try {
            console.log('Fetching user in-out records for roomUUID:', roomUUID);
            console.log('Using baseURL:', this.baseURL);

            // Lưu ý: API này dùng POST method với body param
            const response = await axios.post<UserInOutResponse>(
                `${this.baseURL}/v1/user/organization/room/time-in-out-by-user-by-token`,
                {
                    room_uuid: roomUUID,
                    token,
                    page: options?.page || 1,
                    limit: options?.limit || 50
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (response.data.status !== 0) {
                throw new Error('Failed to fetch user in-out records');
            }

            console.log('User in-out records fetched successfully:', {
                recordsCount: response.data.data.length
            });

            // Kiểm tra nếu có dữ liệu để lấy roomTitle
            const roomTitle = response.data.data.length > 0
                ? response.data.data[0].room_title
                : 'Unknown Room';

            return {
                totalRecords: response.data.data.length,
                records: response.data.data,
                roomUUID: roomUUID,
                roomTitle: roomTitle
            };

        } catch (error: any) {
            console.error('Error fetching user in-out records:', error);
            console.error('Error response:', error.response?.data);
            throw new Error(`Failed to fetch user in-out records: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Lấy tất cả user in-out records của một phòng (tự động lấy tất cả trang)
     */
    async getAllRoomUserInOut(roomUUID: string, token: string): Promise<UserInOutSummary> {
        try {
            console.log('Fetching all user in-out records for roomUUID:', roomUUID);

            const allRecords: UserInOutRecord[] = [];
            let currentPage = 1;
            const limit = 50;
            let hasMore = true;
            let roomTitle = '';

            while (hasMore) {
                console.log(`Fetching user in-out records page ${currentPage} for room ${roomUUID}`);

                const response = await this.getRoomUserInOut(roomUUID, token, {
                    page: currentPage,
                    limit: limit
                });

                // Lưu room title từ page đầu tiên
                if (currentPage === 1) {
                    roomTitle = response.roomTitle;
                }

                allRecords.push(...response.records);

                // Kiểm tra nếu không còn dữ liệu hoặc ít hơn limit
                if (response.records.length === 0 || response.records.length < limit) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            console.log(`Fetched all ${allRecords.length} user in-out records for room "${roomTitle}"`);

            return {
                totalRecords: allRecords.length,
                records: allRecords,
                roomUUID: roomUUID,
                roomTitle: roomTitle
            };

        } catch (error: any) {
            console.error('Error fetching all user in-out records:', error);
            throw new Error(`Failed to fetch all user in-out records: ${error.message}`);
        }
    }

    /**
     * Lấy summary thống kê user in-out
     */
    async getUserInOutSummary(roomUUID: string, token: string): Promise<{
        totalUsers: number;
        totalDurationMinutes: number;
        averageDurationMinutes: number;
        activeUsers: number;
        completedUsers: number;
        roomTitle: string;
        records: UserInOutRecord[];
    }> {
        try {
            const allRecords = await this.getAllRoomUserInOut(roomUUID, token);

            // Tính toán các thống kê
            const activeUsers = allRecords.records.filter(record => record.time_out === null).length;
            const completedUsers = allRecords.records.filter(record => record.time_out !== null).length;

            // Tính tổng duration (chỉ tính những user đã out)
            const completedRecords = allRecords.records.filter(record => record.time_out !== null);
            const totalDurationMinutes = completedRecords.reduce((sum, record) => {
                return sum + (record.duration_minutes || 0);
            }, 0);

            const averageDurationMinutes = completedUsers > 0
                ? Number((totalDurationMinutes / completedUsers).toFixed(2))
                : 0;

            return {
                totalUsers: allRecords.totalRecords,
                totalDurationMinutes,
                averageDurationMinutes,
                activeUsers,
                completedUsers,
                roomTitle: allRecords.roomTitle,
                records: allRecords.records
            };

        } catch (error: any) {
            console.error('Error generating user in-out summary:', error);
            throw new Error(`Failed to generate user in-out summary: ${error.message}`);
        }
    }

    /**
     * Lấy thông tin user in-out của một user cụ thể trong room
     */
    async getUserInOutByUser(roomUUID: string, userUUID: string, token: string): Promise<UserInOutRecord[]> {
        try {
            console.log(`Fetching user in-out records for user ${userUUID} in room ${roomUUID}`);

            const allRecords = await this.getAllRoomUserInOut(roomUUID, token);

            // Lọc records theo userUUID
            const userRecords = allRecords.records.filter(record => record.user_uuid === userUUID);

            console.log(`Found ${userRecords.length} records for user ${userUUID}`);

            return userRecords;

        } catch (error: any) {
            console.error('Error fetching user in-out by user:', error);
            throw new Error(`Failed to fetch user in-out by user: ${error.message}`);
        }
    }

    /**
     * Lấy thông tin user in-out với phân tích chi tiết
     */
    async getUserInOutAnalysis(roomUUID: string, token: string): Promise<{
        summary: {
            totalUsers: number;
            totalDurationMinutes: number;
            averageDurationMinutes: number;
            activeUsers: number;
            completedUsers: number;
            roomTitle: string;
        };
        userStats: Array<{
            user_uuid: string;
            user_name: string;
            total_duration_minutes: number;
            join_count: number;
            average_duration_minutes: number;
            last_join_time: string;
            last_leave_time: string | null;
            is_currently_in_room: boolean;
        }>;
        timeDistribution: {
            byHour: Record<string, number>; // Số user join theo giờ
            byDuration: {
                lessThan5min: number;
                between5and30min: number;
                between30and60min: number;
                moreThan60min: number;
            };
        };
    }> {
        try {
            const allRecords = await this.getAllRoomUserInOut(roomUUID, token);

            // Tổng hợp thống kê theo user
            const userStatsMap = new Map<string, {
                user_uuid: string;
                user_name: string;
                total_duration_minutes: number;
                join_count: number;
                records: UserInOutRecord[];
            }>();

            // Phân bố theo giờ
            const byHour: Record<string, number> = {};

            // Phân bố theo duration
            const durationStats = {
                lessThan5min: 0,
                between5and30min: 0,
                between30and60min: 0,
                moreThan60min: 0
            };

            for (const record of allRecords.records) {
                // Thống kê theo user
                if (!userStatsMap.has(record.user_uuid)) {
                    userStatsMap.set(record.user_uuid, {
                        user_uuid: record.user_uuid,
                        user_name: record.user_name,
                        total_duration_minutes: 0,
                        join_count: 0,
                        records: []
                    });
                }

                const userStat = userStatsMap.get(record.user_uuid)!;
                userStat.join_count++;
                userStat.total_duration_minutes += record.duration_minutes || 0;
                userStat.records.push(record);

                // Thống kê theo giờ
                const joinTime = new Date(record.time_in);
                const hour = joinTime.getHours().toString().padStart(2, '0');
                byHour[hour] = (byHour[hour] || 0) + 1;

                // Thống kê theo duration
                if (record.duration_minutes < 5) {
                    durationStats.lessThan5min++;
                } else if (record.duration_minutes < 30) {
                    durationStats.between5and30min++;
                } else if (record.duration_minutes < 60) {
                    durationStats.between30and60min++;
                } else {
                    durationStats.moreThan60min++;
                }
            }

            // Chuyển map thành array và tính toán thêm
            const userStats = Array.from(userStatsMap.values()).map(userStat => {
                const sortedRecords = userStat.records.sort((a, b) =>
                    new Date(b.time_in).getTime() - new Date(a.time_in).getTime()
                );

                return {
                    ...userStat,
                    average_duration_minutes: userStat.join_count > 0
                        ? Number((userStat.total_duration_minutes / userStat.join_count).toFixed(2))
                        : 0,
                    last_join_time: sortedRecords[0]?.time_in || '',
                    last_leave_time: sortedRecords[0]?.time_out || null,
                    is_currently_in_room: sortedRecords[0]?.time_out === null
                };
            });

            // Sắp xếp user theo tổng duration giảm dần
            userStats.sort((a, b) => b.total_duration_minutes - a.total_duration_minutes);

            // Tính summary
            const activeUsers = userStats.filter(user => user.is_currently_in_room).length;
            const completedUsers = allRecords.records.filter(record => record.time_out !== null).length;
            const totalDurationMinutes = userStats.reduce((sum, user) => sum + user.total_duration_minutes, 0);

            return {
                summary: {
                    totalUsers: userStats.length,
                    totalDurationMinutes,
                    averageDurationMinutes: completedUsers > 0
                        ? Number((totalDurationMinutes / completedUsers).toFixed(2))
                        : 0,
                    activeUsers,
                    completedUsers,
                    roomTitle: allRecords.roomTitle
                },
                userStats,
                timeDistribution: {
                    byHour,
                    byDuration: durationStats
                }
            };

        } catch (error: any) {
            console.error('Error generating user in-out analysis:', error);
            throw new Error(`Failed to generate user in-out analysis: ${error.message}`);
        }
    }
}
