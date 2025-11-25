import { Subscription, Plan } from '@/payload-types';

export interface SubscriptionCheck {
    hasActiveSubscription: boolean;
    subscription?: Subscription;
    plan?: Plan;
    usage?: {
        roomsCreated: number;
        totalDuration: number;
        maxRoomsPerMonth: number;
        maxDurationPerRoom: number;
    };
    canCreateRoom: boolean;
    limitations?: string[];
}

export class SubscriptionService {
    static async checkUserSubscription(customerId: string): Promise<SubscriptionCheck> {
        try {
            // Find active subscription for customer
            const response = await fetch('/dashboard-api/subscriptions/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customerId }),
            });

            if (!response.ok) {
                throw new Error('Failed to check subscription');
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking subscription:', error);
            throw error;
        }
    }

    static async updateUsage(
        subscriptionId: string,
        duration: number,
        participantsCount: number = 0
    ): Promise<void> {
        try {
            const response = await fetch('/dashboard-api/subscriptions/usage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscriptionId,
                    duration,
                    participantsCount,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update usage');
            }
        } catch (error) {
            console.error('Error updating subscription usage:', error);
            throw error;
        }
    }
}
