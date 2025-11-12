import { NextResponse } from 'next/server'
import { authenticateCustomer, checkMeetingOwner } from '../../../../../lib/moodle-auth-utils'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // params là Promise
) {
    // Await params trước khi sử dụng
    const { id } = await params
    const payload = await getPayload({ config })

    const meetingId = id
    console.log('Meeting ID:', meetingId)

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

        const formData = await request.formData()
        const name = formData.get('name') as string
        const moodle_course_id = formData.get('moodle_course_id') as string
        const moodle_user_email = formData.get('moodle_user_email') as string
        const start_time = formData.get('start_time') as string
        const duration = formData.get('duration') as string

        if (!name) {
            return NextResponse.json(
                { error: 'Meeting name is required.' },
                { status: 400 }
            )
        }

        // Update meeting
        const dataToUpdate: any = {
            name,
            moodle_course_id: moodle_course_id || null,
            moodle_user_email: moodle_user_email || null,
            start_time: start_time ? new Date(start_time) : null,
            duration: duration ? parseInt(duration) : null,
        }

        const updatedMeeting = await payload.update({
            collection: 'meetings',
            id: meetingId,
            data: dataToUpdate,
        })

        return NextResponse.json({ data: updatedMeeting })

    } catch (error: any) {
        console.error(`Error updating meeting ${meetingId}: ${error.message}`)
        return NextResponse.json(
            { error: 'Failed to update meeting' },
            { status: 500 }
        )
    }
}
