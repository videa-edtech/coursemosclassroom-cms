import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from "@payload-config";

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config });
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Tìm customer bằng email
        const customers = await payload.find({
            collection: 'customers',
            where: {
                email: {
                    equals: email,
                },
            },
            limit: 1,
        });

        if (customers.docs.length === 0) {
            // Nếu không tìm thấy customer, tạo mới
            const newCustomer = await payload.create({
                collection: 'customers',
                data: {
                    email: email,
                    name: email.split('@')[0],
                },
            });

            return NextResponse.json({
                customerId: newCustomer.id,
                isNew: true,
            });
        }

        const customer = customers.docs[0];
        return NextResponse.json({
            customerId: customer.id,
            isNew: false,
        });
    } catch (error) {
        console.error('Error finding customer by email:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
