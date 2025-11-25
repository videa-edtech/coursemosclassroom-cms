// src/components/dashboard/panels/SubscriptionManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { FlatUser } from '@/services/flat/types';
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, Clock, AlertCircle, Calendar, CreditCard, Download } from 'lucide-react';

interface Subscription {
    id: string;
    customer: string;
    plan: {
        id: string;
        name: string;
        price: number;
        currency: string;
        billingPeriod: string;
        maxParticipants: number;
        maxDuration: number;
        recordingStorage: number;
        maxRoomsPerMonth: number;
    };
    startDate: string;
    endDate: string;
    status: 'active' | 'inactive' | 'cancelled' | 'expired' | 'pending';
    autoRenew: boolean;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    customer: string;
    subscription: string;
    plan: string;
    amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
    billingPeriod: {
        start: string;
        end: string;
    };
    dueDate: string;
    paidDate?: string;
    items: Array<{
        description: string;
        amount: number;
        quantity: number;
    }>;
    taxAmount: number;
    totalAmount: number;
    createdAt: string;
}

interface SubscriptionManagementProps {
    user: FlatUser;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({ user }) => {
    const { user: authUser } = useAuth();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'subscriptions' | 'invoices'>('subscriptions');

    useEffect(() => {
        fetchSubscriptions();
        fetchInvoices();
    }, [user]);

    const fetchSubscriptions = async () => {
        if (!user?.token) return;

        setLoading(true);
        setError(null);
        try {
            // Tìm customer ID từ email
            const customerResponse = await fetch(`/api/customers/frontend?where[email][equals]=${encodeURIComponent(user.email)}`);
            if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                if (customerData.docs && customerData.docs.length > 0) {
                    const customerId = customerData.docs[0].id;

                    // Fetch subscriptions của customer
                    const subscriptionResponse = await fetch(`/api/subscriptions/frontend?where[customer][equals]=${customerId}&sort=-createdAt`);
                    if (subscriptionResponse.ok) {
                        const subscriptionData = await subscriptionResponse.json();
                        setSubscriptions(subscriptionData.docs || []);
                    }
                }
            }
        } catch (error: any) {
            console.error('Error fetching subscriptions:', error);
            setError('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const fetchInvoices = async () => {
        if (!user?.token) return;

        try {
            // Tìm customer ID từ email
            const customerResponse = await fetch(`/api/customers/frontend?where[email][equals]=${encodeURIComponent(user.email)}`);
            if (customerResponse.ok) {
                const customerData = await customerResponse.json();
                if (customerData.docs && customerData.docs.length > 0) {
                    const customerId = customerData.docs[0].id;

                    // Fetch invoices của customer
                    const invoiceResponse = await fetch(`/api/invoices/frontend?where[customer][equals]=${customerId}&sort=-createdAt`);
                    if (invoiceResponse.ok) {
                        const invoiceData = await invoiceResponse.json();
                        setInvoices(invoiceData.docs || []);
                    }
                }
            }
        } catch (error: any) {
            console.error('Error fetching invoices:', error);
            // Không set error ở đây vì invoices không quan trọng bằng subscriptions
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'bg-green-100 text-green-800', icon: Check, label: 'Active' },
            inactive: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Inactive' },
            cancelled: { color: 'bg-red-100 text-red-800', icon: X, label: 'Cancelled' },
            expired: { color: 'bg-orange-100 text-orange-800', icon: AlertCircle, label: 'Expired' },
            pending: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pending' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3" />
                {config.label}
      </span>
        );
    };

    const getInvoiceStatusBadge = (status: string) => {
        const statusConfig = {
            paid: { color: 'bg-green-100 text-green-800', icon: Check, label: 'Paid' },
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
            draft: { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Draft' },
            failed: { color: 'bg-red-100 text-red-800', icon: X, label: 'Failed' },
            refunded: { color: 'bg-blue-100 text-blue-800', icon: Download, label: 'Refunded' },
            cancelled: { color: 'bg-red-100 text-red-800', icon: X, label: 'Cancelled' },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3" />
                {config.label}
      </span>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
    };

    const handleCancelSubscription = async (subscriptionId: string) => {
        if (!confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/subscriptions/frontend/${subscriptionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'cancelled',
                    cancelAtPeriodEnd: true,
                }),
            });

            if (response.ok) {
                alert('Subscription cancelled successfully');
                fetchSubscriptions(); // Refresh data
            } else {
                throw new Error('Failed to cancel subscription');
            }
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            alert('Failed to cancel subscription');
        }
    };

    const handleRenewSubscription = async (subscriptionId: string) => {
        try {
            const response = await fetch(`/api/subscriptions/frontend/${subscriptionId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    autoRenew: true,
                    cancelAtPeriodEnd: false,
                }),
            });

            if (response.ok) {
                alert('Subscription renewed successfully');
                fetchSubscriptions(); // Refresh data
            } else {
                throw new Error('Failed to renew subscription');
            }
        } catch (error) {
            console.error('Error renewing subscription:', error);
            alert('Failed to renew subscription');
        }
    };

    const downloadInvoice = (invoice: Invoice) => {
        // Tạo PDF invoice (đơn giản)
        const invoiceContent = `
      INVOICE: ${invoice.invoiceNumber}
      Date: ${formatDate(invoice.createdAt)}
      Due Date: ${formatDate(invoice.dueDate)}
      Status: ${invoice.status.toUpperCase()}
      
      Description: ${invoice.items[0]?.description || 'Subscription'}
      Amount: ${formatCurrency(invoice.amount, invoice.currency)}
      Tax: ${formatCurrency(invoice.taxAmount, invoice.currency)}
      Total: ${formatCurrency(invoice.totalAmount, invoice.currency)}
      
      Thank you for your business!
    `;

        const blob = new Blob([invoiceContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${invoice.invoiceNumber}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Subscription Management</h2>
                <button
                    onClick={() => {
                        fetchSubscriptions();
                        fetchInvoices();
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'subscriptions'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Subscriptions ({subscriptions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'invoices'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Invoices ({invoices.length})
                    </button>
                </nav>
            </div>

            {/* Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
                <div className="space-y-4">
                    {subscriptions.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by subscribing to a plan.</p>
                            <div className="mt-6">
                                <a
                                    href="/pricing"
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    View Plans
                                </a>
                            </div>
                        </div>
                    ) : (
                        subscriptions.map((subscription) => (
                            <div key={subscription.id} className="bg-white border rounded-lg p-6">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <h3 className="text-lg font-semibold">
                                                {typeof subscription.plan === 'object' ? subscription.plan.name : 'Plan'}
                                            </h3>
                                            {getStatusBadge(subscription.status)}
                                            {subscription.autoRenew && (
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Auto Renew
                        </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                          <strong>Start:</strong> {formatDate(subscription.startDate)}
                        </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                          <strong>End:</strong> {formatDate(subscription.endDate)}
                        </span>
                                            </div>
                                            <div>
                                                <strong>Price:</strong>{' '}
                                                {typeof subscription.plan === 'object'
                                                    ? formatCurrency(subscription.plan.price, subscription.plan.currency)
                                                    : 'N/A'
                                                }
                                            </div>
                                            <div>
                                                <strong>Billing:</strong>{' '}
                                                {typeof subscription.plan === 'object'
                                                    ? subscription.plan.billingPeriod
                                                    : 'N/A'
                                                }
                                            </div>
                                        </div>

                                        {/* Plan Features */}
                                        {typeof subscription.plan === 'object' && (
                                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                <div>Participants: {subscription.plan.maxParticipants}</div>
                                                <div>Duration: {subscription.plan.maxDuration === 0 ? 'Unlimited' : `${subscription.plan.maxDuration}min`}</div>
                                                <div>Storage: {subscription.plan.recordingStorage}GB</div>
                                                <div>Rooms: {subscription.plan.maxRoomsPerMonth}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
                                            <button
                                                onClick={() => handleCancelSubscription(subscription.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                                            >
                                                Cancel Subscription
                                            </button>
                                        )}
                                        {subscription.status === 'active' && subscription.cancelAtPeriodEnd && (
                                            <button
                                                onClick={() => handleRenewSubscription(subscription.id)}
                                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                                            >
                                                Renew Subscription
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setActiveTab('invoices')}
                                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                                        >
                                            View Invoices
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
                <div className="space-y-4">
                    {invoices.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                            <p className="mt-1 text-sm text-gray-500">Your invoices will appear here.</p>
                        </div>
                    ) : (
                        <div className="bg-white border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Due Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(invoice.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCurrency(invoice.totalAmount, invoice.currency)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getInvoiceStatusBadge(invoice.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(invoice.dueDate)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => downloadInvoice(invoice)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SubscriptionManagement;
