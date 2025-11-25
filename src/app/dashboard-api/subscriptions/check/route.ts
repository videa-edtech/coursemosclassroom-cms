// app/api/subscriptions/check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from "@payload-config";

export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({ config });
        const { customerId } = await request.json();

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            );
        }

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
        const monthlyUsage = subscription.monthlyUsage || {
            roomsCreated: 0,
            totalMinutes: 0,
            participantsCount: 0,
        };

        const currentMonth = new Date().toISOString().slice(0, 7);
        const isCurrentMonth = monthlyUsage.month === currentMonth;

        const roomsCreated = isCurrentMonth ? monthlyUsage.roomsCreated : 0;
        const totalMinutes = isCurrentMonth ? monthlyUsage.totalMinutes : 0;

        const remainingRooms = Math.max(0, plan.maxRoomsPerMonth - roomsCreated);
        const remainingMinutes = Math.max(0, plan.maxMinutesPerMonth - totalMinutes);

        const limitations: string[] = [];

        if (remainingRooms <= 0) {
            limitations.push('Monthly room limit reached');
        }

        if (remainingMinutes <= 0) {
            limitations.push('Monthly minutes limit reached');
        }

        const canCreateRoom = limitations.length === 0;

        return NextResponse.json({
            hasActiveSubscription: true,
            subscription,
            plan,
            usage: {
                roomsCreated,
                totalMinutes,
                maxRoomsPerMonth: plan.maxRoomsPerMonth,
                maxMinutesPerMonth: plan.maxMinutesPerMonth,
                maxDurationPerRoom: plan.maxDuration,
                remainingRooms,
                remainingMinutes,
            },
            canCreateRoom,
            limitations: limitations.length > 0 ? limitations : undefined,
        });
    } catch (error) {
        console.error('Error checking subscription:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
