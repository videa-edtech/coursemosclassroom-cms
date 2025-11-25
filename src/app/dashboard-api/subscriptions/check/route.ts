import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from "@payload-config";
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({config});
        const { customerId } = await request.json();

        // Find active subscription
        const subscriptions = await payload.find({
            collection: 'subscriptions',
            where: {
                and: [
                    { customer: { equals: customerId } },
                    { status: { equals: 'active' } },
                    { startDate: { less_than_equal: new Date().toISOString() } },
                    { endDate: { greater_than_equal: new Date().toISOString() } },
                ],
            },
            depth: 2, // Include plan details
        });

        if (subscriptions.docs.length === 0) {
            return NextResponse.json({
                hasActiveSubscription: false,
                canCreateRoom: false,
                limitations: ['No active subscription found'],
            });
        }

        const subscription = subscriptions.docs[0];
        const plan = subscription.plan as any;

        // Get current month usage
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyUsage = subscription.monthlyUsage?.month === currentMonth
            ? subscription.monthlyUsage
            : { roomsCreated: 0, totalDuration: 0, participantsCount: 0 };

        // Check quota limitations
        const limitations: string[] = [];

        if (monthlyUsage.roomsCreated >= plan.maxRoomsPerMonth) {
            limitations.push(`Monthly room limit reached (${plan.maxRoomsPerMonth} rooms)`);
        }

        const canCreateRoom = limitations.length === 0;

        return NextResponse.json({
            hasActiveSubscription: true,
            subscription,
            plan,
            usage: {
                roomsCreated: monthlyUsage.roomsCreated,
                totalDuration: monthlyUsage.totalDuration,
                maxRoomsPerMonth: plan.maxRoomsPerMonth,
                maxDurationPerRoom: plan.maxDuration,
            },
            canCreateRoom,
            limitations,
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
