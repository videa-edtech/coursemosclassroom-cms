// src/app/api/auth/check-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from "payload";
import config from "@payload-config";

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { email } = body;

        // Validate email
        if (!email) {
            return NextResponse.json(
                {
                    message: 'Email is required',
                    status: 1
                },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                {
                    message: 'Invalid email format',
                    status: 1
                },
                { status: 400 }
            );
        }

        // Sanitize email
        const sanitizedEmail = email.trim().toLowerCase();

        // Initialize Payload
        const payload = await getPayload({ config });

        // Check if email exists in customers collection
        const existingCustomers = await payload.find({
            collection: 'customers',
            where: {
                email: {
                    equals: sanitizedEmail,
                }
            },
            limit: 1,
            depth: 0
        });

        if (existingCustomers.totalDocs > 0) {
            return NextResponse.json({
                status: 0,
                data: {
                    exists: true,
                    message: 'Email already registered',
                    email: sanitizedEmail
                }
            });
        }

        // Email is available
        return NextResponse.json({
            status: 0,
            data: {
                exists: false,
                message: 'Email is available',
                email: sanitizedEmail
            }
        });

    } catch (error: any) {
        console.error('Error in check-email API:', error);

        return NextResponse.json(
            {
                message: 'An error occurred while checking email',
                status: 1,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: 500 }
        );
    }
}

// GET method handler
export async function GET(request: NextRequest) {
    return NextResponse.json(
        {
            message: 'Method not allowed. Use POST instead.',
            status: 1
        },
        { status: 405 }
    );
}
