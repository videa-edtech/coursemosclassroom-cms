import type { CollectionConfig } from 'payload'

export const Subscriptions: CollectionConfig = {
    slug: 'subscriptions',
    admin: {
        useAsTitle: 'id',
        defaultColumns: ['customer', 'plan', 'status', 'startDate', 'endDate'],
    },
    access: {
        read: ({ req }) => true,
        create: ({ req }) => true,
        update: ({ req }) => true,
        delete: ({ req }) => !!req.user,
    },
    fields: [
        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'customers',
            required: true,
            hasMany: false,
        },
        {
            name: 'plan',
            type: 'relationship',
            relationTo: 'plans',
            required: true,
            hasMany: false,
        },
        {
            name: 'startDate',
            type: 'date',
            required: true,
        },
        {
            name: 'endDate',
            type: 'date',
            required: true,
        },
        {
            name: 'status',
            type: 'select',
            options: [
                {
                    label: 'Active',
                    value: 'active',
                },
                {
                    label: 'Inactive',
                    value: 'inactive',
                },
                {
                    label: 'Cancelled',
                    value: 'cancelled',
                },
                {
                    label: 'Expired',
                    value: 'expired',
                },
                {
                    label: 'Pending',
                    value: 'pending',
                },
            ],
            defaultValue: 'pending',
        },
        {
            name: 'autoRenew',
            type: 'checkbox',
            defaultValue: true,
        },
        {
            name: 'currentPeriodStart',
            type: 'date',
        },
        {
            name: 'currentPeriodEnd',
            type: 'date',
        },
        {
            name: 'cancelAtPeriodEnd',
            type: 'checkbox',
            defaultValue: false,
        },
        // Monthly usage tracking
        {
            name: 'monthlyUsage',
            type: 'group',
            fields: [
                {
                    name: 'month',
                    type: 'text', // Format: YYYY-MM
                    required: true,
                },
                {
                    name: 'roomsCreated',
                    type: 'number',
                    defaultValue: 0,
                },
                {
                    name: 'totalDuration',
                    type: 'number',
                    label: 'Total Duration (minutes)',
                    defaultValue: 0,
                },
                {
                    name: 'participantsCount',
                    type: 'number',
                    defaultValue: 0,
                },
            ],
        },
        // Usage history array to track multiple months
        {
            name: 'usageHistory',
            type: 'array',
            fields: [
                {
                    name: 'month',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'roomsCreated',
                    type: 'number',
                    defaultValue: 0,
                },
                {
                    name: 'totalDuration',
                    type: 'number',
                    defaultValue: 0,
                },
                {
                    name: 'participantsCount',
                    type: 'number',
                    defaultValue: 0,
                },
            ],
        },
    ],
    hooks: {
        beforeChange: [
            ({ data, operation }) => {
                if (operation === 'create') {
                    if (data.startDate && !data.currentPeriodStart) {
                        data.currentPeriodStart = data.startDate
                    }
                    // Initialize current month usage
                    const currentMonth = new Date().toISOString().slice(0, 7)
                    if (!data.monthlyUsage) {
                        data.monthlyUsage = {
                            month: currentMonth,
                            roomsCreated: 0,
                            totalDuration: 0,
                            participantsCount: 0,
                        }
                    }
                }
                return data
            },
        ],
    },
    timestamps: true,
}
