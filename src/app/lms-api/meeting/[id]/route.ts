import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {authenticateCustomer, checkMeetingOwner} from "../../../../../lib/moodle-auth-utils";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const meetingId = id

    if (!meetingId) {
        return NextResponse.json(
            { error: 'Meeting ID is required.' },
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

        // Check owner using shared function
        const ownerCheck = await checkMeetingOwner(meetingId, customer.id)
        if (!ownerCheck.exists) {
            return NextResponse.json(
                { error: 'Meeting not found or you do not have permission.' },
                { status: 404 }
            )
        }

        return NextResponse.json({ data: ownerCheck.meeting })

    } catch (error: any) {
        console.error(`Error fetching meeting ${meetingId}: ${error.message}`)
        return NextResponse.json(
            { error: 'Failed to fetch meetings.' },
            { status: 500 }
        )
    }
}
