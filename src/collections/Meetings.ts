import type { CollectionConfig } from 'payload'

export const Meetings: CollectionConfig = {
    slug: 'meetings',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'customer_id', 'flat_room_link', 'status'],
    },
    fields: [
        {
            name: 'customer_id',
            type: 'relationship',
            relationTo: 'customers',
            required: true,
            admin: {
                position: 'sidebar',
            },
        },
        {
            name: 'subscription_id',
            type: 'relationship',
            relationTo: 'subscriptions',
            required: true,
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
            required: true,
        },
        {
            name: 'end_time',
            type: 'date',
            required: true,
        },
        {
            name: 'duration',
            type: 'number',
            admin: {
                description: 'Duration (minutes)',
            },
        },
        {
            name: 'participants_count',
            type: 'number',
            defaultValue: 0,
        },
        {
            name: 'status',
            type: 'select',
            options: ['scheduled', 'active', 'completed', 'cancelled'],
            defaultValue: 'scheduled',
        },
        {
            name: 'users',
            type: 'array',
            fields: [
                {
                    name: 'email',
                    type: 'text',
                    required: true,
                },
            ],
            admin: {
                description: 'Email list',
            },
        },
    ],
    hooks: {
        afterChange: [
            async ({ doc, operation, req }) => {
                if (operation === 'create' && doc.subscription_id && doc.duration) {
                    try {
                        // Update subscription usage
                        const subscription = await req.payload.findByID({
                            collection: 'subscriptions',
                            id: doc.subscription_id,
                        })

                        const currentMonth = new Date().toISOString().slice(0, 7)

                        // Update monthly usage
                        await req.payload.update({
                            collection: 'subscriptions',
                            id: doc.subscription_id,
                            data: {
                                monthlyUsage: {
                                    month: currentMonth,
                                    roomsCreated: (subscription.monthlyUsage?.roomsCreated || 0) + 1,
                                    totalDuration: (subscription.monthlyUsage?.totalDuration || 0) + doc.duration,
                                    participantsCount: (subscription.monthlyUsage?.participantsCount || 0) + doc.participants_count,
                                },
                            },
                        })
                    } catch (error) {
                        console.error('Error updating subscription usage:', error)
                    }
                }
            },
        ],
    },
}
