// src/app/api/auth/register/send-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { flatService } from '@/services/flatService';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { message: 'Email is required' },
                { status: 400 }
            );
        }

        await flatService.sendVerificationCode(email);

        return NextResponse.json({
            status: 0,
            message: 'Verification code sent successfully'
        });

    } catch (error: any) {
        console.error('Send code API error:', error);

        return NextResponse.json(
            {
                message: error.message || 'Internal server error',
                status: 1
            },
            { status: 500 }
        );
    }
}
