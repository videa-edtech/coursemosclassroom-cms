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

export interface FlatRoomResponse {
    status: number;
    data: {
        roomUUID: string;
        inviteCode: string;
    };
}

export interface StopRoomRequest {
    roomUUID: string;
}

export interface StopRoomResponse {
    status: number;
    data: {
        roomUUID: string;
        roomStatus: string;
    };
}

export interface RoomListResponse {
    status: number;
    data: {
        total: number;
        list: RoomItem[];
        page: number;
        limit: number;
    };
}

export interface RoomItem {
    id: string;
    created_at: string;
    updated_at: string;
    version: number;
    room_uuid: string;
    periodic_uuid: string;
    owner_uuid: string;
    title: string;
    room_type: string;
    room_status: string;
    begin_time: string;
    end_time: string;
    region: string;
    whiteboard_room_uuid: string;
    is_delete: number;
    has_record: number;
    is_ai: number;
    user_uuid: string;
    user_name: string;
}

export interface RoomInfoResponse {
    status: number;
    data: {
        roomInfo: {
            title: string;
            beginTime: number;
            endTime: number;
            roomType: string;
            roomStatus: 'Idle' | 'Started' | 'Stopped' | 'Paused';
            ownerUUID: string;
            ownerUserName: string;
            ownerName: string;
            hasRecord: boolean;
            region: string;
            inviteCode: string;
            isPmi: boolean;
            isAI: boolean;
        };
    };
}

export interface TotalMinutesResponse {
    totalMinutes: number;
    totalRooms: number;
    rooms: Array<{
        roomUUID: string;
        title: string;
        duration: number;
        beginTime: number;
        endTime: number;
        roomStatus: string;
    }>;
}

export interface RoomInfoRequest {
    roomUUID: string;
}

export interface RoomParticipantsRequest {
    room_uuid: string;
    page?: number;
    limit?: number;
}

export interface RoomParticipant {
    room_title: string;
    avatar_url: string;
    user_name: string;
}

export interface RoomParticipantsResponse {
    status: number;
    data: {
        total: number;
        list: RoomParticipant[];
        page: number;
        limit: number;
    };
}

export interface RoomParticipantsSummary {
    totalParticipants: number;
    participants: RoomParticipant[];
    roomTitle: string;
}

export interface UserInOutRecord {
    created_at: string;
    updated_at: string;
    room_uuid: string;
    user_uuid: string;
    time_in: string; // ISO string
    time_out: string | null; // ISO string, null if still in room
    is_delete: number;
    room_title: string;
    user_name: string;
    duration_minutes: number; // duration tính bằng phút
}

export interface UserInOutResponse {
    status: number;
    data: UserInOutRecord[];
}

export interface UserInOutSummary {
    totalRecords: number;
    records: UserInOutRecord[];
    roomUUID: string;
    roomTitle: string;
}
