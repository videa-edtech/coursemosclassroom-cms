import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {authenticateCustomer} from "../../../../lib/moodle-auth-utils";

export async function GET(request: Request) {
    const payload = await getPayload({ config })

    try {
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const meetings = await payload.find({
            collection: 'meetings',
            where: { customer_id: { equals: customer.id } },
            limit: 1000,
        })

        return NextResponse.json({ meetings: meetings.docs })

    } catch (error: any) {
        console.error(`Error fetching meetings: ${error.message}`)
        return NextResponse.json(
            { error: 'Failed to fetch meetings.' },
            { status: 500 }
        )
    }
}
