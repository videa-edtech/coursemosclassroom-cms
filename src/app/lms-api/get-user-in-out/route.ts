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

        // Verify token và lấy dữ liệu
        const privateKey = process.env.JWT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const decoded = jwt.verify(token, privateKey) as any;
        console.log('Decoded token:', decoded.token);

        const data = await flatService.getRoomUserInOutByToken(roomUUID, token);
        return NextResponse.json(
            {
                data
            },
            { status: 201 }
        )

    } catch (error: any) {
        console.error(`Error creating meeting: ${error.message}`)
        console.error('Full error stack:', error.stack)

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 400 }
            )
        }

        if (error.name === 'TokenExpiredError') {
            return NextResponse.json(
                { error: 'Token expired' },
                { status: 400 }
            )
        }

        // Handle specific Flat API errors
        if (error.response?.data?.message) {
            return NextResponse.json(
                { error: `Flat API error: ${error.response.data.message}` },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to create meeting: ' + error.message },
            { status: 500 }
        )
    }
}
