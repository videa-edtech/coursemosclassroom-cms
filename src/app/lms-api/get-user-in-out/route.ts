import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { authenticateCustomer } from "../../../../lib/moodle-auth-utils";
import { flatService } from "@/services/flat";
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
    const payload = await getPayload({ config })

    try {
        // Xác thực customer
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.log('Customer authenticated:', customer.id);

        const formData = await request.formData()
        const roomUUID = formData.get('room_uuid') as string
        const token = formData.get('token') as string

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required.' },
                { status: 400 }
            )
        }

        if (!roomUUID) {
            return NextResponse.json(
                { error: 'Room UUID is required.' },
                { status: 400 }
            )
        }

        // Verify token và lấy dữ liệu
        const privateKey = process.env.JWT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const decoded = jwt.verify(token, privateKey) as any;
        console.log('Decoded token:', decoded);

        // Lấy dữ liệu user in/out và room info
        const [userInOutData, roomInfoData] = await Promise.all([
            flatService.getRoomUserInOutByToken(roomUUID, token),
            (async () => {
                try {
                    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_FLAT_USER_NAME || '';
                    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_FLAT_PASSWORD || '';

                    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
                        console.warn('Admin credentials not configured');
                        return null;
                    }

                    const user = await flatService.login({
                        email: ADMIN_EMAIL,
                        password: ADMIN_PASSWORD
                    });

                    if (user && user.token) {
                        return await flatService.getRoomInfo(roomUUID, user.token);
                    }
                    return null;
                } catch (error) {
                    console.error('Error fetching room info:', error);
                    return null;
                }
            })()
        ]);

        return NextResponse.json(
            {
                success: true,
                data: {
                    userInOut: userInOutData,
                    roomInfo: roomInfoData
                }
            },
            { status: 200 }
        )

    } catch (error: any) {
        console.error(`Error fetching room details: ${error.message}`)
        console.error('Full error stack:', error.stack)

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid token'
                },
                { status: 400 }
            )
        }

        if (error.name === 'TokenExpiredError') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Token expired'
                },
                { status: 400 }
            )
        }

        // Handle specific Flat API errors
        if (error.response?.data?.message) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Flat API error: ${error.response.data.message}`
                },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch room details: ' + error.message
            },
            { status: 500 }
        )
    }
}
