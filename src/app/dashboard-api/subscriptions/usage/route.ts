import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from "@payload-config";
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayload({config});
        const { subscriptionId, duration, participantsCount = 0 } = await request.json();

        const subscription = await payload.findByID({
            collection: 'subscriptions',
            id: subscriptionId,
        });

        const currentMonth = new Date().toISOString().slice(0, 7);

        // Check if we need to reset monthly usage
        let monthlyUsage = subscription.monthlyUsage;
        if (!monthlyUsage || monthlyUsage.month !== currentMonth) {
            monthlyUsage = {
                month: currentMonth,
                roomsCreated: 0,
                totalDuration: 0,
                participantsCount: 0,
            };
        }

        // Update usage
        const updatedUsage = {
            month: currentMonth,
            roomsCreated: monthlyUsage.roomsCreated + 1,
            totalDuration: monthlyUsage.totalDuration + duration,
            participantsCount: monthlyUsage.participantsCount + participantsCount,
        };

        // Add to usage history
        const usageHistory = subscription.usageHistory || [];
        const existingMonthIndex = usageHistory.findIndex(
            (item: any) => item.month === currentMonth
        );

        if (existingMonthIndex >= 0) {
            usageHistory[existingMonthIndex] = updatedUsage;
        } else {
            usageHistory.push(updatedUsage);
        }

        await payload.update({
            collection: 'subscriptions',
            id: subscriptionId,
            data: {
                monthlyUsage: updatedUsage,
                usageHistory,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating subscription usage:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
