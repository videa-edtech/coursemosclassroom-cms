// src/app/api/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/payload/payloadClient';

export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadClient();
        const { searchParams } = new URL(request.url);

        const where = searchParams.get('where');
        const sort = searchParams.get('sort');
        const limit = searchParams.get('limit');

        let query = {};
        if (where) {
            query = JSON.parse(where);
        }

        const result = await payload.find({
            collection: 'invoices',
            where: query,
            sort: sort || '-createdAt',
            limit: limit ? parseInt(limit) : 100,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching invoices:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadClient();
        const data = await request.json();

        const result = await payload.create({
            collection: 'invoices',
            data,
        });

        const customer = await payload.findByID({
            collection: 'customers',
            id: result.customer as string,
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }
        console.log(`Sending invoice ${result.invoiceNumber} to ${customer.email}`);
        return NextResponse.json({ doc: result });
    } catch (error) {
        console.error('Error creating invoice:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

