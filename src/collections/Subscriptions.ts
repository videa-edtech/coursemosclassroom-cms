// collections/Subscriptions.ts
import type { CollectionConfig } from 'payload'

export const Subscriptions: CollectionConfig = {
    slug: 'subscriptions',
    admin: {
        useAsTitle: 'id',
        defaultColumns: ['customer', 'plan', 'status', 'startDate', 'endDate', 'autoRenew'],
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
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
                { label: 'Cancelled', value: 'cancelled' },
                { label: 'Expired', value: 'expired' },
                { label: 'Pending Payment', value: 'pending' },
            ],
            defaultValue: 'pending',
            admin: {
                description: 'Status will be automatically updated based on invoice payment and dates',
            },
        },
        {
            name: 'autoRenew',
            type: 'checkbox',
            defaultValue: true,
            admin: {
                description: 'Automatically renew subscription at the end of billing period',
            },
        },
        {
            name: 'currentPeriodStart',
            type: 'date',
            admin: {
                description: 'Start date of current billing period',
            },
        },
        {
            name: 'currentPeriodEnd',
            type: 'date',
            admin: {
                description: 'End date of current billing period',
            },
        },
        {
            name: 'cancelAtPeriodEnd',
            type: 'checkbox',
            defaultValue: false,
            admin: {
                description: 'Cancel subscription at the end of current billing period',
            },
        },
        // Monthly usage tracking
        {
            name: 'monthlyUsage',
            type: 'group',
            fields: [
                {
                    name: 'month',
                    type: 'text',
                    admin: { description: 'Format: YYYY-MM' },
                },
                {
                    name: 'roomsCreated',
                    type: 'number',
                    defaultValue: 0,
                    min: 0,
                    admin: { description: 'Number of rooms created this month' },
                },
                {
                    name: 'totalMinutes',
                    type: 'number',
                    label: 'Total Minutes Used',
                    defaultValue: 0,
                    min: 0,
                    admin: { description: 'Total minutes used this month' },
                },
                {
                    name: 'participantsCount',
                    type: 'number',
                    defaultValue: 0,
                    min: 0,
                    admin: { description: 'Total participants count this month' },
                },
            ],
            admin: {
                description: 'Current month usage statistics',
            },
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
                    admin: { description: 'Format: YYYY-MM' },
                },
                {
                    name: 'roomsCreated',
                    type: 'number',
                    defaultValue: 0,
                    min: 0,
                },
                {
                    name: 'totalMinutes',
                    type: 'number',
                    defaultValue: 0,
                    min: 0,
                },
                {
                    name: 'participantsCount',
                    type: 'number',
                    defaultValue: 0,
                    min: 0,
                },
            ],
            admin: {
                description: 'Historical usage data for previous months',
            },
        },
    ],
    hooks: {
        beforeChange: [
            async ({ data, operation, req, originalDoc }) => {
                if (operation === 'create') {
                    // Set current period dates based on start date
                    if (data.startDate && !data.currentPeriodStart) {
                        data.currentPeriodStart = data.startDate;
                    }

                    if (data.startDate && !data.currentPeriodEnd) {
                        const endDate = new Date(data.startDate);

                        // Get plan to determine billing period
                        let planId = data.plan;

                        // Handle relationship object
                        if (typeof planId === 'object' && planId?.value) {
                            planId = planId.value;
                        }

                        // Try to calculate end date based on plan billing period
                        if (planId) {
                            try {
                                const plan = await req.payload.findByID({
                                    collection: 'plans',
                                    id: planId.toString(),
                                });

                                if (plan.billingPeriod === 'yearly') {
                                    endDate.setFullYear(endDate.getFullYear() + 1);
                                } else if (plan.billingPeriod === 'quarterly') {
                                    endDate.setMonth(endDate.getMonth() + 3);
                                } else {
                                    endDate.setMonth(endDate.getMonth() + 1);
                                }
                            } catch (error) {
                                console.error('Error fetching plan for billing period:', error);
                                // Default to monthly if plan not found
                                endDate.setMonth(endDate.getMonth() + 1);
                            }
                        } else {
                            endDate.setMonth(endDate.getMonth() + 1);
                        }
                        data.currentPeriodEnd = endDate.toISOString();
                    }

                    // Initialize monthly usage
                    if (!data.monthlyUsage) {
                        const currentMonth = new Date().toISOString().slice(0, 7);
                        data.monthlyUsage = {
                            month: currentMonth,
                            roomsCreated: 0,
                            totalMinutes: 0,
                            participantsCount: 0,
                        };
                    }
                }

                // Auto-update status based on dates
                if (data.startDate && data.endDate) {
                    const now = new Date();
                    const startDate = new Date(data.startDate);
                    const endDate = new Date(data.endDate);

                    // Only auto-update status if not manually set to cancelled
                    if (data.status !== 'cancelled') {
                        if (now < startDate) {
                            data.status = 'pending';
                        } else if (now > endDate) {
                            data.status = 'expired';
                        } else if (data.status === 'pending') {
                            // For existing subscriptions, check if should be active
                            const subscriptionId = data.id || (originalDoc?.id);
                            if (subscriptionId) {
                                try {
                                    const invoices = await req.payload.find({
                                        collection: 'invoices',
                                        where: {
                                            and: [
                                                { subscription: { equals: subscriptionId } },
                                                { status: { equals: 'paid' } },
                                            ],
                                        },
                                        limit: 1,
                                    });

                                    if (invoices.docs.length > 0) {
                                        data.status = 'active';
                                    }
                                } catch (error) {
                                    console.error('Error checking invoices:', error);
                                }
                            }
                        }
                    }
                }

                // Reset monthly usage if month has changed
                if (data.monthlyUsage?.month) {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    if (data.monthlyUsage.month !== currentMonth) {
                        // Archive current usage to history
                        if (!data.usageHistory) {
                            data.usageHistory = [];
                        }

                        data.usageHistory.push({
                            month: data.monthlyUsage.month,
                            roomsCreated: data.monthlyUsage.roomsCreated || 0,
                            totalMinutes: data.monthlyUsage.totalMinutes || 0,
                            participantsCount: data.monthlyUsage.participantsCount || 0,
                        });

                        // Reset monthly usage for new month
                        data.monthlyUsage = {
                            month: currentMonth,
                            roomsCreated: 0,
                            totalMinutes: 0,
                            participantsCount: 0,
                        };
                    }
                }

                return data;
            },
        ],

        afterChange: [
            async ({ doc, operation, req }) => {
                // CASE 1: NEW SUBSCRIPTION
                if (operation === 'create') {
                    try {
                        // Extract ID from relationship
                        let planId = doc.plan;
                        if (typeof planId === 'object' && planId !== null) {
                            planId = planId.id || planId.value;
                        }

                        if (!planId) {
                            throw new Error('Invalid plan ID');
                        }

                        console.log('🔍 Fetching plan details for invoice creation:', planId);

                        // Fetch plan details
                        const plan = await req.payload.findByID({
                            collection: 'plans',
                            id: planId.toString(),
                        });

                        if (!plan) {
                            throw new Error(`Plan with ID ${planId} not found`);
                        }

                        const dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + 7);

                        // Extract Customer ID
                        let customerId = doc.customer;
                        if (typeof customerId === 'object' && customerId !== null) {
                            customerId = customerId.id || customerId.value;
                        }

                        // FIXED: Generate invoice number and include all required fields
                        const generateInvoiceNumber = () => {
                            const date = new Date();
                            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                            return `INV-${dateStr}-${random}`;
                        };

                        // FIXED: Prepare Invoice Data with all required fields including invoiceNumber
                        const invoiceData = {
                            invoiceNumber: generateInvoiceNumber(), // FIXED: Add required invoiceNumber field
                            customer: customerId,
                            subscription: doc.id,
                            plan: planId,
                            amount: plan.price,
                            currency: plan.currency,
                            status: 'pending' as const,
                            billingPeriod: {
                                start: doc.startDate,
                                end: doc.endDate,
                            },
                            dueDate: dueDate.toISOString(),
                            items: [
                                {
                                    description: `${plan.name} Subscription - ${plan.billingPeriod}`,
                                    amount: plan.price,
                                    quantity: 1,
                                },
                            ],
                            subtotal: plan.price,
                            taxAmount: 0,
                            totalAmount: plan.price,
                            notes: 'Auto-generated invoice for new subscription',
                        };

                        console.log('📝 Creating initial invoice...');

                        // FIXED: CREATE INVOICE with draft property
                        const createdInvoice = await req.payload.create({
                            collection: 'invoices',
                            data: invoiceData,
                            draft: false,
                            req,
                        });

                        console.log(`✅ Invoice created successfully: ${createdInvoice.invoiceNumber}`);

                    } catch (error) {
                        console.error('❌ Error creating initial invoice:', error);
                    }
                }

                // CASE 2: AUTO RENEWAL
                if (operation === 'update' && doc.autoRenew && doc.status === 'active') {
                    const now = new Date();
                    const periodEnd = new Date(doc.currentPeriodEnd);

                    // Check if subscription needs renewal (within 7 days of end date)
                    const renewalThreshold = new Date(periodEnd);
                    renewalThreshold.setDate(renewalThreshold.getDate() - 7);

                    if (now >= renewalThreshold && now < periodEnd) {
                        try {
                            let planId = doc.plan;
                            if (typeof planId === 'object' && planId !== null) {
                                planId = planId.id || planId.value;
                            }

                            if (!planId) {
                                console.error('Invalid plan ID for auto-renewal');
                                return;
                            }

                            const plan = await req.payload.findByID({
                                collection: 'plans',
                                id: planId.toString(),
                            });

                            if (!plan) {
                                console.error('Plan not found for auto-renewal');
                                return;
                            }

                            // Calculate new dates
                            const newStartDate = new Date(periodEnd);
                            const newEndDate = new Date(periodEnd);

                            if (plan.billingPeriod === 'yearly') {
                                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                            } else if (plan.billingPeriod === 'quarterly') {
                                newEndDate.setMonth(newEndDate.getMonth() + 3);
                            } else {
                                newEndDate.setMonth(newEndDate.getMonth() + 1);
                            }

                            const renewalDueDate = new Date();
                            renewalDueDate.setDate(renewalDueDate.getDate() + 7);

                            let customerId = doc.customer;
                            if (typeof customerId === 'object' && customerId !== null) {
                                customerId = customerId.id || customerId.value;
                            }

                            // FIXED: Generate invoice number for renewal invoice
                            const generateInvoiceNumber = () => {
                                const date = new Date();
                                const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
                                const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                                return `INV-${dateStr}-${random}`;
                            };

                            // FIXED: CREATE RENEWAL INVOICE with all required fields including invoiceNumber
                            await req.payload.create({
                                collection: 'invoices',
                                data: {
                                    invoiceNumber: generateInvoiceNumber(), // FIXED: Add required invoiceNumber field
                                    customer: customerId,
                                    subscription: doc.id,
                                    plan: planId,
                                    amount: plan.price,
                                    currency: plan.currency,
                                    status: 'pending' as const,
                                    billingPeriod: {
                                        start: newStartDate.toISOString(),
                                        end: newEndDate.toISOString(),
                                    },
                                    dueDate: renewalDueDate.toISOString(),
                                    items: [
                                        {
                                            description: `${plan.name} Subscription Renewal - ${plan.billingPeriod}`,
                                            amount: plan.price,
                                            quantity: 1,
                                        },
                                    ],
                                    subtotal: plan.price,
                                    taxAmount: 0,
                                    totalAmount: plan.price,
                                    notes: 'Auto-generated invoice for subscription renewal',
                                },
                                draft: false,
                                req,
                            });

                            console.log(`✅ Renewal invoice created for subscription ${doc.id}`);
                        } catch (error) {
                            console.error('Error creating renewal invoice:', error);
                        }
                    }
                }
            },
        ],
    },
    timestamps: true,
}
