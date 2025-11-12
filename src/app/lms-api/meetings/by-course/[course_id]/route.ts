import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {authenticateCustomer} from "../../../../../../lib/moodle-auth-utils";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ course_id: string }> }
) {
    const { course_id } = await params
    const payload = await getPayload({ config })
    const courseId = course_id

    if (!courseId) {
        return NextResponse.json(
            { error: 'Moodle Course ID is required.' },
            { status: 400 }
        )
    }

    try {
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Lấy tất cả meetings của customer VÀ course ID
        const meetings = await payload.find({
            collection: 'meetings',
            where: {
                and: [
                    { customer_id: { equals: customer.id } },
                    { moodle_course_id: { equals: courseId } }
                ]
            },
            limit: 1000,
        })

        return NextResponse.json({ meetings: meetings.docs })

    } catch (error: any) {
        console.error(`Error fetching meetings for course ${courseId}: ${error.message}`)
        return NextResponse.json(
            { error: 'Failed to fetch meetings.' },
            { status: 500 }
        )
    }
}
