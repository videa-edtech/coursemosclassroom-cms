import type { CollectionConfig } from 'payload'

export const Invoices: CollectionConfig = {
    slug: 'invoices',
    admin: {
        useAsTitle: 'invoice_id',
    },
    fields: [
        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'customers',
            required: true,
        },
        {
            name: 'subscription',
            type: 'relationship',
            relationTo: 'subscriptions',
            required: true,
        },
        {
            name: 'invoice_id',
            type: 'text',
            required: true,
            unique: true,
        },
        {
            name: 'amount',
            type: 'number',
            required: true,
        },
        {
            name: 'currency',
            type: 'select',
            options: ['USD', 'EUR', 'VND'],
            defaultValue: 'USD',
        },
        {
            name: 'status',
            type: 'select',
            options: ['pending', 'paid', 'failed', 'refunded'],
            defaultValue: 'pending',
        },
        {
            name: 'paidDate',
            type: 'date',
            required: false,
        },
        {
            name: 'dueDate',
            type: 'date',
            required: true,
        },
        {
            name: 'description',
            type: 'textarea',
            required: false,
        },
    ],
}

