// src/actions/flatActions.ts
'use server'

import { FlatService } from '@/services/flat/FlatService'
// Import các type cần thiết (lưu ý chỉ import type)
import type { FlatRoom } from '@/services/flat/types'

const flatService = new FlatService();

// Lấy thông tin credential từ biến môi trường
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_FLAT_USER_NAME || '';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_FLAT_PASSWORD || '';

export async function getAdminRoomsAction(userName?: string) {
    try {
        // 1. Login Admin
        const user = await flatService.login({
            type: 'email',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });

        if (!user || !user.token) {
            throw new Error("Admin login failed");
        }

        // 2. Get Rooms (Admin token)
        // Lưu ý: data trả về từ Server Action phải là Plain Object (JSON serializable)
        const rooms = await flatService.getUserRooms(user.token, 1, 50);

        // 3. Filter rooms by userName if provided
        let filteredRooms = rooms;
        if (userName) {
            filteredRooms = {
                ...rooms,
                list: rooms.list.filter((room: any) =>
                    room.user_name && room.user_name.toLowerCase().includes(userName.toLowerCase())
                )
            };
        }
        // Parse JSON để đảm bảo không có function/class instance được gửi về client
        return {
            success: true,
            data: JSON.parse(JSON.stringify(filteredRooms)),
            token: user.token
        };
    } catch (error: any) {
        console.error("Server Action Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getRoomDetailAction(roomUUID: string, token: string) {
    try {
        const [participants, userInOut] = await Promise.all([
            flatService.getAllRoomParticipants(roomUUID, token),
            flatService.getAllRoomUserInOut(roomUUID, token)
        ]);
        return {
            success: true,
            data: {
                participants: JSON.parse(JSON.stringify(participants)),
                userInOut: JSON.parse(JSON.stringify(userInOut))
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
