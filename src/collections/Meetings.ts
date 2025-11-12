import type { CollectionConfig } from 'payload'

export const Meetings: CollectionConfig = {
    slug: 'meetings',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'customer_id', 'flat_room_link'],
    },
    fields: [
        {
            name: 'customer_id',
            type: 'relationship',
            relationTo: 'customers', // Liên kết tới Collection Customers
            required: true,
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        {
            name: 'moodle_course_id',
            type: 'text',
        },
        {
            name: 'moodle_user_email',
            type: 'text',
        },
        {
            name: 'flat_room_id',
            type: 'text',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'flat_room_link',
            type: 'text',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'start_time',
            type: 'date',
        },
        {
            name: 'duration',
            type: 'number',
            admin: {
                description: 'Thời lượng (phút)',
            },
        },
    ],
}

