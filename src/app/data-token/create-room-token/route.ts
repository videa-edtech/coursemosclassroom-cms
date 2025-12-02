import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        const { title, type, beginTime, endTime, email, clientKey } = await request.json();

        const privateKey = process.env.JWT_PRIVATE_KEY!;

        const token = jwt.sign(
            {
                title,
                type,
                beginTime: beginTime.toString(),
                endTime: endTime.toString(),
                pmi: false,
                region: 'cn-hz',
                email,
                clientKey
            },
            privateKey,
            { algorithm: 'HS256' }
        );
        return NextResponse.json({ token });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
