// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { flatService } from '@/services/flat';
import {getPayload} from "payload";
import config from "@payload-config";

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config })
        const { email, password, code } = await request.json();

        if (!email || !password || !code) {
            return NextResponse.json(
                { message: 'Email, password and code are required' },
                { status: 400 }
            );
        }

        const user = await flatService.register({ email, password, code });
        //Tạo user trên backend
        const name = email.split('@')[0];
        const customer = await payload.create({
            collection: 'customers',
            data: {
                name: name,
                email: email,
                secret_key: '',
                password: password
            },
        });

        try {
            const loginResult = await flatService.login({ email, password });

            // 4. Cập nhật secret_key với clientKey từ login
            const updatedCustomer = await payload.update({
                collection: 'customers',
                id: customer.id,
                data: {
                    secret_key: loginResult.clientKey
                }
            });
            user.clientKey = loginResult.clientKey;
            // 5. Trả về kết hợp cả register và login data
            return NextResponse.json({
                status: 0,
                data: {
                    ...user,
                    loginData: loginResult,
                    customer: updatedCustomer
                }
            });

        } catch (loginError: any) {
            console.warn('Register successful but auto-login failed:', loginError);

            return NextResponse.json({
                status: 0,
                data: user,
                warning: 'Registration successful but auto-login failed. Please login manually.',
                customer: customer
            });
        }

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
