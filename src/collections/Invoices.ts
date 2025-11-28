// collections/Invoices.ts
import type { CollectionConfig } from 'payload'

export const Invoices: CollectionConfig = {
    slug: 'invoices',
    admin: {
        useAsTitle: 'invoiceNumber',
        defaultColumns: ['invoiceNumber', 'customer', 'amount', 'status', 'dueDate'],
    },
    access: {
        read: ({ req }) => true,
        create: ({ req }) => !!req.user,
        update: ({ req }) => !!req.user,
        delete: ({ req }) => !!req.user,
    },
    fields: [
        {
            name: 'invoiceNumber',
            type: 'text',
            required: true,
            unique: true,
            defaultValue: () => {
                const date = new Date();
                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                return `INV-${dateStr}-${random}`;
            },
            admin: {
                readOnly: true,
            },
        },
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
            name: 'plan',
            type: 'relationship',
            relationTo: 'plans',
            required: true,
        },
        {
            name: 'amount',
            type: 'number',
            required: true,
            min: 0,
        },
        {
            name: 'currency',
            type: 'select',
            options: [
                { label: 'USD', value: 'USD' },
                { label: 'EUR', value: 'EUR' },
                { label: 'VND', value: 'VND' }
            ],
            defaultValue: 'USD',
            required: true,
        },
        {
            name: 'status',
            type: 'select',
            options: [
                { label: 'Draft', value: 'draft' },
                { label: 'Pending', value: 'pending' },
                { label: 'Paid', value: 'paid' },
                { label: 'Failed', value: 'failed' },
                { label: 'Refunded', value: 'refunded' },
                { label: 'Cancelled', value: 'cancelled' }
            ],
            defaultValue: 'draft',
            required: true,
        },
        {
            name: 'billingPeriod',
            type: 'group',
            fields: [
                {
                    name: 'start',
                    type: 'date',
                    required: true,
                },
                {
                    name: 'end',
                    type: 'date',
                    required: true,
                },
            ],
            required: true,
        },
        {
            name: 'dueDate',
            type: 'date',
            required: true,
        },
        {
            name: 'paidDate',
            type: 'date',
        },
        {
            name: 'items',
            type: 'array',
            required: true,
            minRows: 1,
            fields: [
                {
                    name: 'description',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'amount',
                    type: 'number',
                    required: true,
                    min: 0,
                },
                {
                    name: 'quantity',
                    type: 'number',
                    required: true,
                    min: 1,
                    defaultValue: 1,
                },
            ],
        },
        {
            name: 'subtotal',
            type: 'number',
            required: true,
            min: 0,
            admin: {
                readOnly: true,
                description: 'Auto-calculated from items',
            },
        },
        {
            name: 'taxAmount',
            type: 'number',
            defaultValue: 0,
            min: 0,
        },
        {
            name: 'totalAmount',
            type: 'number',
            required: true,
            min: 0,
            admin: {
                readOnly: true,
                description: 'Auto-calculated total',
            },
        },
        {
            name: 'notes',
            type: 'textarea',
        },
    ],
    hooks: {
        beforeValidate: [
            async ({ data, req, operation }) => {
                console.log('🔧 Invoice beforeValidate:', {
                    data: data ? {
                        customer: data.customer,
                        subscription: data.subscription,
                        plan: data.plan,
                        amount: data.amount
                    } : 'No data'
                });

                if (data) {
                    // Extract IDs từ relationship objects
                    if (data.customer && typeof data.customer === 'object') {
                        data.customer = data.customer.id || data.customer;
                    }
                    if (data.subscription && typeof data.subscription === 'object') {
                        data.subscription = data.subscription.id || data.subscription;
                    }
                    if (data.plan && typeof data.plan === 'object') {
                        data.plan = data.plan.id || data.plan;
                    }

                    // Kiểm tra plan có tồn tại không
                    if (data.plan && operation === 'create') {
                        try {
                            const plan = await req.payload.findByID({
                                collection: 'plans',
                                id: data.plan.toString(),
                            });

                            if (!plan) {
                                console.error('❌ Plan not found:', data.plan);
                                throw new Error(`Plan with ID ${data.plan} not found`);
                            }

                            console.log('✅ Plan validated:', plan.name);
                        } catch (error) {
                            console.error('❌ Error validating plan:', error);
                            // FIXED: Proper error handling for unknown type
                            if (error instanceof Error) {
                                throw new Error(`Invalid plan: ${error.message}`);
                            } else {
                                throw new Error('Invalid plan: Unknown error occurred');
                            }
                        }
                    }

                    // Auto-calculate totals từ items
                    if (data.items && Array.isArray(data.items)) {
                        const subtotal = data.items.reduce((sum: number, item: any) => {
                            const itemAmount = Number(item.amount) || 0;
                            const itemQuantity = Number(item.quantity) || 1;
                            return sum + (itemAmount * itemQuantity);
                        }, 0);

                        data.subtotal = subtotal;
                        data.totalAmount = subtotal + (Number(data.taxAmount) || 0);

                        // Đảm bảo amount bằng totalAmount
                        if (!data.amount || data.amount === 0) {
                            data.amount = data.totalAmount;
                        }
                    }

                    // Set default values if not provided
                    if (!data.dueDate) {
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 7);
                        data.dueDate = dueDate.toISOString();
                    }
                }
                return data;
            },
        ],

        beforeChange: [
            async ({ data, operation, req }) => {
                console.log('🔧 Invoice beforeChange:', {
                    operation,
                    data: data ? {
                        customer: data.customer,
                        subscription: data.subscription,
                        plan: data.plan
                    } : 'No data'
                });

                if (operation === 'create') {
                    // Validate plan exists
                    if (!data.plan) {
                        throw new Error('Plan is required for invoice creation');
                    }

                    try {
                        const plan = await req.payload.findByID({
                            collection: 'plans',
                            id: data.plan.toString(),
                        });

                        if (!plan) {
                            throw new Error(`Plan with ID ${data.plan} not found`);
                        }
                    } catch (error) {
                        console.error('❌ Error validating plan in beforeChange:', error);
                        // FIXED: Proper error handling for unknown type
                        if (error instanceof Error) {
                            throw new Error(`Invalid plan: ${error.message}`);
                        } else {
                            throw new Error('Invalid plan: Unknown error occurred');
                        }
                    }

                    // Đảm bảo có ít nhất một item mặc định
                    if (!data.items || data.items.length === 0) {
                        data.items = [
                            {
                                description: 'Subscription Fee',
                                amount: data.amount || 0,
                                quantity: 1,
                            }
                        ];
                    }

                    // Set default billing period từ subscription nếu không được cung cấp
                    if (!data.billingPeriod && data.subscription) {
                        try {
                            console.log('🔍 Fetching subscription for billing period:', data.subscription);
                            const subscription = await req.payload.findByID({
                                collection: 'subscriptions',
                                id: data.subscription,
                            });

                            if (subscription) {
                                data.billingPeriod = {
                                    start: subscription.startDate,
                                    end: subscription.endDate,
                                };
                                console.log('✅ Set billing period from subscription:', data.billingPeriod);
                            }
                        } catch (error) {
                            console.error('❌ Error fetching subscription for billing period:', error);
                            // Fallback to default billing period
                            const startDate = new Date();
                            const endDate = new Date();
                            endDate.setMonth(endDate.getMonth() + 1);

                            data.billingPeriod = {
                                start: startDate.toISOString(),
                                end: endDate.toISOString(),
                            };
                        }
                    }

                    // Set default due date nếu không được cung cấp
                    if (!data.dueDate) {
                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 7);
                        data.dueDate = dueDate.toISOString();
                    }
                }
                return data;
            },
        ],

        afterChange: [
            async ({ doc, operation, req }) => {
                console.log(`🔄 Invoice afterChange: ${doc.invoiceNumber}, Status: ${doc.status}, Operation: ${operation}`);

                // Khi invoice được chuyển sang trạng thái paid, cập nhật subscription status
                if (doc.status === 'paid' && doc.subscription) {
                    try {
                        console.log(`💰 Invoice paid, activating subscription: ${doc.subscription}`);

                        await req.payload.update({
                            collection: 'subscriptions',
                            id: doc.subscription,
                            data: {
                                status: 'active',
                                startDate: doc.billingPeriod.start,
                                endDate: doc.billingPeriod.end,
                                currentPeriodStart: doc.billingPeriod.start,
                                currentPeriodEnd: doc.billingPeriod.end,
                            },
                        });

                        console.log(`✅ Subscription ${doc.subscription} activated for paid invoice ${doc.invoiceNumber}`);
                    } catch (error) {
                        console.error('❌ Error updating subscription status:', error);
                        // FIXED: Proper error handling for unknown type
                        if (error instanceof Error) {
                            console.error('Error details:', error.message);
                        } else {
                            console.error('Unknown error occurred while updating subscription status');
                        }
                    }
                }

                // Khi invoice bị cancelled hoặc failed, cập nhật subscription status
                if ((doc.status === 'cancelled' || doc.status === 'failed') && doc.subscription) {
                    try {
                        console.log(`🚫 Invoice ${doc.status}, deactivating subscription: ${doc.subscription}`);

                        await req.payload.update({
                            collection: 'subscriptions',
                            id: doc.subscription,
                            data: {
                                status: 'inactive',
                            },
                        });

                        console.log(`✅ Subscription ${doc.subscription} deactivated for ${doc.status} invoice ${doc.invoiceNumber}`);
                    } catch (error) {
                        console.error('❌ Error deactivating subscription:', error);
                        // FIXED: Proper error handling for unknown type
                        if (error instanceof Error) {
                            console.error('Error details:', error.message);
                        } else {
                            console.error('Unknown error occurred while deactivating subscription');
                        }
                    }
                }
            },
        ],
    },
    timestamps: true,
}
