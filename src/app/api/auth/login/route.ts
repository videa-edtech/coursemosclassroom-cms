// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { flatService } from '@/services/flatService';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Email and password are required' },
                { status: 400 }
            );
        }

        const user = await flatService.login({ email, password });

        return NextResponse.json({
            status: 0,
            data: user
        });

    } catch (error: any) {
        console.error('Login API error:', error);

        return NextResponse.json(
            {
                message: error.message || 'Internal server error',
                status: 1
            },
            { status: 500 }
        );
    }
}
