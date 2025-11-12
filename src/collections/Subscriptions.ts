import { CollectionConfig } from 'payload/types';

export const Subscriptions: CollectionConfig = {
    slug: 'subscriptions',
    admin: {
        useAsTitle: 'id',
    },
    fields: [
        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'customers',
            required: true,
        },
        {
            name: 'plan',
            type: 'select',
            options: ['basic', 'pro', 'enterprise'],
            required: true,
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
            options: ['active', 'inactive', 'cancelled', 'expired'],
            defaultValue: 'active',
        },
        {
            name: 'autoRenew',
            type: 'checkbox',
            defaultValue: true,
        },
    ],
    timestamps: true,
};
