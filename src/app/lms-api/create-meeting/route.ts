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
        const end_time = formData.get('end_time') as string
        const duration = formData.get('duration') as string
        if (!name) {
            return NextResponse.json(
                { error: 'Meeting name is required.' },
                { status: 400 }
            )
        }

        let flatRoom;
        try {
            // Tính beginTime từ start_time
            const beginTime = new Date(Number(start_time)).getTime()
            const endTime = new Date(Number(end_time)).getTime()


            // Lấy email teacher từ customer hoặc từ moodle_user_email
            const teacherEmail = moodle_user_email;

            if (!teacherEmail) {
                throw new Error('Teacher email is required');
            }

            flatRoom = await flatService.createRoom(
                {
                    title: name,
                    type: 'SmallClass',
                    beginTime: beginTime,
                    endTime: endTime,
                    email: teacherEmail
                },
                customer
            );
            console.log('flatRoom: '+flatRoom)


        } catch (error) {
            console.error('Failed to create Flat.io room:', error);
            return NextResponse.json(
                { error: 'Failed to create virtual classroom: ' + (error as Error).message },
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
                start_time: start_time ? new Date(Number(start_time)).getTime() : null,
                end_time: end_time ? new Date(Number(end_time)).getTime() : null,
                duration: duration ? parseInt(duration) : null,
                flat_room_id: flatRoom.roomUUID,
                flat_room_link: flatRoom.joinUrl,
            },
        })

        return NextResponse.json(
            {
                data: {
                    joinUrl: flatRoom.joinUrl,
                    newMeeting: newMeeting
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
