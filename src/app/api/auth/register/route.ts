// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { flatService } from '@/services/flatService';

export async function POST(request: NextRequest) {
    try {
        const { email, password, code } = await request.json();

        if (!email || !password || !code) {
            return NextResponse.json(
                { message: 'Email, password and code are required' },
                { status: 400 }
            );
        }

        const user = await flatService.register({ email, password, code });

        return NextResponse.json({
            status: 0,
            data: user
        });

    } catch (error: any) {
        console.error('Register API error:', error);

        return NextResponse.json(
            {
                message: error.message || 'Internal server error',
                status: 1
            },
            { status: 500 }
        );
    }
}
