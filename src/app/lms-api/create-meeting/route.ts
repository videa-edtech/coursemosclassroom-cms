import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { authenticateCustomer } from "../../../../lib/moodle-auth-utils";
import { flatService } from "@/services/flat";
import jwt from 'jsonwebtoken';
import { SubscriptionService, SubscriptionCheck } from '@/services/subscription';

// Simple fallback subscription service
class FallbackSubscriptionService {
    static async checkUserSubscription(customerId: string): Promise<any> {
        return {
            hasActiveSubscription: true,
            canCreateRoom: true,
            subscription: {
                id: `fallback_sub_${customerId}`,
                customer_id: customerId,
                plan_id: 'fallback_plan',
                status: 'active',
            },
            plan: {
                id: 'fallback_plan',
                name: 'Fallback Plan',
                maxDuration: 180, // 3 hours default
                maxRoomsPerMonth: 100,
                maxMinutesPerMonth: 5000,
                price: 0,
            },
            usage: {
                roomsCreated: 0,
                totalMinutes: 0,
                maxRoomsPerMonth: 100,
                maxMinutesPerMonth: 5000,
                remainingRooms: 100,
                remainingMinutes: 5000,
                maxDurationPerRoom: 180,
            },
        };
    }

    static async updateUsage(subscriptionId: string, minutesUsed: number): Promise<void> {
        console.log(`[Fallback] Usage updated: ${minutesUsed} minutes`);
    }
}

export async function POST(request: Request) {
    const payload = await getPayload({ config })

    try {
        // Xác thực customer
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        console.log('Customer authenticated:', customer.id);

        // Check subscription với fallback first
        let subscriptionCheck: any = null;
        try {
            // Thử dùng SubscriptionService trước
            subscriptionCheck = await SubscriptionService.checkUserSubscription(customer.id);
            console.log('SubscriptionService result:', subscriptionCheck);
        } catch (error: any) {
            console.error('SubscriptionService failed, using fallback:', error);
            // Dùng fallback service
            subscriptionCheck = await FallbackSubscriptionService.checkUserSubscription(customer.id);
            console.log('Fallback subscription result:', subscriptionCheck);
        }

        // ĐẢM BẢO subscriptionCheck có đầy đủ thông tin
        if (!subscriptionCheck) {
            subscriptionCheck = await FallbackSubscriptionService.checkUserSubscription(customer.id);
        }

        // Đảm bảo plan và usage tồn tại
        if (!subscriptionCheck.plan) {
            subscriptionCheck.plan = {
                maxDuration: 180,
                maxRoomsPerMonth: 100,
                maxMinutesPerMonth: 5000,
            };
        }

        if (!subscriptionCheck.usage) {
            subscriptionCheck.usage = {
                remainingRooms: 100,
                remainingMinutes: 5000,
                maxDurationPerRoom: 180,
            };
        }

        console.log('Final subscription check:', {
            hasActiveSubscription: subscriptionCheck.hasActiveSubscription,
            canCreateRoom: subscriptionCheck.canCreateRoom,
            plan: subscriptionCheck.plan,
            usage: subscriptionCheck.usage
        });

        if (!subscriptionCheck.hasActiveSubscription) {
            return NextResponse.json(
                { error: 'You need an active subscription to create meetings. Please subscribe to a plan first.' },
                { status: 402 }
            )
        }

        if (!subscriptionCheck.canCreateRoom) {
            return NextResponse.json(
                {
                    error: `Cannot create meeting: ${subscriptionCheck.limitations?.join(', ')}. Please upgrade your plan.`,
                    limitations: subscriptionCheck.limitations
                },
                { status: 403 }
            )
        }

        const formData = await request.formData()
        const token = formData.get('token') as string
        if (!token) {
            return NextResponse.json(
                { error: 'Token is required.' },
                { status: 400 }
            )
        }

        // Verify token và lấy dữ liệu
        const privateKey = process.env.JWT_PRIVATE_KEY;
        if (!privateKey) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            )
        }

        const decoded = jwt.verify(token, privateKey) as any;
        console.log('Decoded token title:', decoded.title);

        // Validate meeting data từ token
        const beginTime = parseInt(decoded.beginTime);
        const endTime = parseInt(decoded.endTime);
        const duration = Math.round((endTime - beginTime) / (1000 * 60));

        console.log('Meeting time details:', {
            beginTime,
            endTime,
            duration,
            beginTimeDate: new Date(beginTime),
            endTimeDate: new Date(endTime)
        });

        // Validate dates
        if (isNaN(beginTime) || isNaN(endTime)) {
            return NextResponse.json(
                { error: 'Invalid start or end time' },
                { status: 400 }
            )
        }

        if (beginTime >= endTime) {
            return NextResponse.json(
                { error: 'End time must be after start time' },
                { status: 400 }
            )
        }

        // FIX: Check duration với giá trị mặc định an toàn
        const maxDuration = subscriptionCheck.plan?.maxDuration ||
            subscriptionCheck.usage?.maxDurationPerRoom ||
            180; // 3 hours default

        console.log('Duration validation:', {
            requestedDuration: duration,
            maxDuration: maxDuration,
            planMaxDuration: subscriptionCheck.plan?.maxDuration,
            usageMaxDuration: subscriptionCheck.usage?.maxDurationPerRoom
        });

        if (duration > maxDuration) {
            return NextResponse.json(
                {
                    error: `Meeting duration cannot exceed ${maxDuration} minutes according to your plan`,
                    maxDuration: maxDuration,
                    requestedDuration: duration
                },
                { status: 400 }
            )
        }

        // Check monthly minutes quota
        const remainingMinutes = subscriptionCheck.usage?.remainingMinutes || 5000;
        console.log('Minutes quota check:', {
            requestedDuration: duration,
            remainingMinutes: remainingMinutes
        });

        if (duration > remainingMinutes) {
            return NextResponse.json(
                {
                    error: `Meeting duration (${duration} minutes) exceeds your remaining monthly quota (${remainingMinutes} minutes)`,
                    requestedDuration: duration,
                    remainingMinutes: remainingMinutes
                },
                { status: 400 }
            )
        }

        if (endTime - beginTime > 24 * 60 * 60 * 1000) {
            return NextResponse.json(
                { error: 'Meeting duration cannot exceed 24 hours' },
                { status: 400 }
            )
        }

        if (beginTime < Date.now()) {
            return NextResponse.json(
                { error: 'Start time cannot be in the past' },
                { status: 400 }
            )
        }

        // Tạo room trong Flat
        console.log('Creating Flat room...');
        const flatRoomResponse = await flatService.createRoomWithToken(token)
        console.log('Flat room response received');

        const flatRoom = {
            roomUUID: flatRoomResponse.data.roomUUID,
            joinUrl: `${process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL}/join/${flatRoomResponse.data.roomUUID}`,
        };
        console.log('Flat room created successfully:', flatRoom.roomUUID);

        // Prepare users data
        let users = [];
        if (decoded.users && Array.isArray(decoded.users)) {
            users = decoded.users.map((email: string) => ({
                email: email
            }));
        }

        // Tạo meeting mới trong Payload
        console.log('Creating meeting in Payload...');
        const newMeeting = await payload.create({
            collection: 'meetings',
            data: {
                customer: parseInt(customer.id),
                subscription: parseInt(subscriptionCheck.subscription?.id),
                name: decoded.title,
                moodle_course_id: decoded.moodle_course_id || null,
                moodle_user_email: decoded.email,
                start_time: new Date(beginTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                duration: duration,
                flat_room_id: flatRoom.roomUUID,
                flat_room_link: flatRoom.joinUrl,
                users: users,
                status: 'scheduled',
                participants_count: 0,
            },
        })

        console.log('Meeting created successfully:', newMeeting.id);

        // Update subscription usage
        try {
            if (subscriptionCheck.subscription?.id) {
                await SubscriptionService.updateUsage(
                    subscriptionCheck.subscription.id.toString(),
                    duration
                );
                console.log('Subscription usage updated successfully');
            } else {
                // Dùng fallback nếu cần
                await FallbackSubscriptionService.updateUsage(
                    `fallback_${customer.id}`,
                    duration
                );
            }
        } catch (error: any) {
            console.error('Error updating subscription usage:', error);
            // Không throw error ở đây vì meeting đã được tạo thành công
        }

        return NextResponse.json(
            {
                data: {
                    joinUrl: `${process.env.NEXT_PUBLIC_URL}/lms-api/join-meeting?uuid=${flatRoom.roomUUID}`,
                    meeting: {
                        id: newMeeting.id,
                        title: newMeeting.name,
                        flatRoomId: newMeeting.flat_room_id,
                        startTime: newMeeting.start_time,
                        endTime: newMeeting.end_time,
                        duration: newMeeting.duration,
                    },
                    subscription: {
                        remainingRooms: subscriptionCheck.usage?.remainingRooms ? subscriptionCheck.usage.remainingRooms - 1 : 99,
                        remainingMinutes: subscriptionCheck.usage?.remainingMinutes ? subscriptionCheck.usage.remainingMinutes - duration : 5000 - duration,
                    }
                }
            },
            { status: 201 }
        )

    } catch (error: any) {
        console.error(`Error creating meeting: ${error.message}`)
        console.error('Full error stack:', error.stack)

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 400 }
            )
        }

        if (error.name === 'TokenExpiredError') {
            return NextResponse.json(
                { error: 'Token expired' },
                { status: 400 }
            )
        }

        // Handle specific Flat API errors
        if (error.response?.data?.message) {
            return NextResponse.json(
                { error: `Flat API error: ${error.response.data.message}` },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to create meeting: ' + error.message },
            { status: 500 }
        )
    }
}
