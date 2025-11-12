import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {authenticateCustomer} from "../../../../lib/moodle-auth-utils";
import {flatService} from "@/services/flatService";
// =================================================================
// CREATE
// =================================================================
export async function POST(request: Request) {
    const payload = await getPayload({ config })

    try {
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
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
        let flatRoom;
        try {
            flatRoom = await flatService.createRoom(
                {
                    name: name,
                    privacy: 'private',
                    noAutoAssignScore: true
                },
                customer
            );
        } catch (error) {
            console.error('Failed to create Flat.io room:', error);
            return NextResponse.json(
                { error: 'Failed to create virtual classroom' },
                { status: 500 }
            )
        }
        // Tạo meeting mới
        const newMeeting = await payload.create({
            collection: 'meetings',
            data: {
                customer_id: customer.id,
                name,
                moodle_course_id: moodle_course_id || null,
                moodle_user_email: moodle_user_email || null,
                start_time: start_time ? new Date(start_time) : null,
                duration: duration ? parseInt(duration) : null,
                flat_room_id: 'temp_id_123',
                flat_room_link: 'http://example.com',
            },
        })

        return NextResponse.json(
            {
                data: {
                    flat_room_link: newMeeting.flat_room_link,
                    id: newMeeting.id
                }
            },
            { status: 201 }
        )

    } catch (error: any) {
        console.error(`Error creating meeting: ${error.message}`)
        return NextResponse.json(
            { error: 'Failed to create meeting.' },
            { status: 500 }
        )
    }
}
