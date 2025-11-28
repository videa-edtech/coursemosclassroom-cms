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

        // Safe handling of monthlyUsage with proper null checking
        const monthlyUsage = subscription.monthlyUsage || {};
        const currentMonth = new Date().toISOString().slice(0, 7);
        const isCurrentMonth = monthlyUsage?.month === currentMonth;

        // Safe access with nullish coalescing
        const roomsCreated = isCurrentMonth ? (monthlyUsage?.roomsCreated ?? 0) : 0;
        const totalMinutes = isCurrentMonth ? (monthlyUsage?.totalMinutes ?? 0) : 0;
        const participantsCount = isCurrentMonth ? (monthlyUsage?.participantsCount ?? 0) : 0;

        // Safe access to plan properties
        const maxRoomsPerMonth = plan?.maxRoomsPerMonth ?? 0;
        const maxMinutesPerMonth = plan?.maxMinutesPerMonth ?? 0;
        const maxDurationPerRoom = plan?.maxDuration ?? 0;

        const remainingRooms = Math.max(0, maxRoomsPerMonth - roomsCreated);
        const remainingMinutes = Math.max(0, maxMinutesPerMonth - totalMinutes);

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
            subscription: {
                id: subscription.id,
                status: subscription.status,
                startDate: subscription.startDate,
                endDate: subscription.endDate,
                autoRenew: subscription.autoRenew,
                monthlyUsage: {
                    month: monthlyUsage?.month || currentMonth,
                    roomsCreated,
                    totalMinutes,
                    participantsCount,
                }
            },
            plan: {
                id: plan?.id,
                name: plan?.name,
                maxRoomsPerMonth,
                maxMinutesPerMonth,
                maxDuration: maxDurationPerRoom,
                maxParticipants: plan?.maxParticipants ?? 0,
            },
            usage: {
                roomsCreated,
                totalMinutes,
                participantsCount,
                maxRoomsPerMonth,
                maxMinutesPerMonth,
                maxDurationPerRoom,
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
