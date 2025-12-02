import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        const { roomUUID, email, clientKey } = await request.json();

        if (!roomUUID || !email || !clientKey) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const privateKey = process.env.JWT_PRIVATE_KEY || '7480945ce27624e77ae7c8980345895c536e013a23ac4510a4248fa46e48419f';

        const payload = {
            iss: "Online JWT Builder",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            aud: process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL,
            sub: email,
            email: email,
            clientKey: clientKey,
            roomUUID: roomUUID
        };

        const token = jwt.sign(payload, privateKey, {
            algorithm: 'HS256'
        });

        return NextResponse.json({
            success: true,
            token,
            joinUrl: `${process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL}/join/${roomUUID}?token=${encodeURIComponent(token)}`
        });

    } catch (error: any) {
        console.error('Token generation error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate token',
                details: error.message
            },
            { status: 500 }
        );
    }
}
