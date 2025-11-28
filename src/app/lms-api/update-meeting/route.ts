import { NextResponse } from 'next/server'
import { authenticateCustomer, checkMeetingOwner } from '../../../../lib/moodle-auth-utils'
import { getPayload } from 'payload'
import config from '@payload-config'
import jwt from 'jsonwebtoken'
import { flatService } from "@/services/flat"

// Constants and error messages
const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Unauthorized',
    TOKEN_REQUIRED: 'Token is required.',
    SERVER_CONFIG_ERROR: 'Server configuration error',
    MEETING_NOT_FOUND: 'Meeting not found.',
    NO_PERMISSION: 'Meeting not found or you do not have permission.',
    MEETING_NAME_REQUIRED: 'Meeting name is required.',
    UPDATE_FAILED: 'Failed to update meeting',
    INVALID_TOKEN: 'Invalid token',
    SUBSCRIPTION_REQUIRED: 'You need an active subscription to update meetings.',
    SUBSCRIPTION_LIMIT: 'Cannot update meeting due to subscription limitations.',
    DURATION_EXCEEDED: 'Meeting duration exceeds your plan limits.',
    TIME_VALIDATION_FAILED: 'Time validation failed',
} as const

const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const

interface DecodedToken {
    title: string
    roomUUID: string
    beginTime?: string
    endTime?: string
    duration?: string
    users?: string[]
}

// FIXED: Use undefined instead of null for Payload CMS
interface UpdateMeetingData {
    name?: string
    start_time?: string
    end_time?: string
    duration?: number
    users?: any[]
}

// Simple fallback subscription service for update operations
class UpdateSubscriptionService {
    static async checkUserSubscription(customerId: string): Promise<any> {
        try {
            const payload = await getPayload({ config });

            // Tìm subscription active
            const subscriptions = await payload.find({
                collection: 'subscriptions',
                where: {
                    and: [
                        {
                            customer: {
                                equals: customerId,
                            },
                        },
                        {
                            status: {
                                equals: 'active',
                            },
                        },
                    ],
                },
                limit: 1,
            });

            if (subscriptions.docs.length === 0) {
                return {
                    hasActiveSubscription: false,
                    canUpdateMeeting: false,
                    limitations: ['No active subscription found'],
                };
            }

            const subscription = subscriptions.docs[0];

            // Lấy plan info
            let plan;
            let planId = (subscription.plan as any).id
            try {
                plan = await payload.findByID({
                    collection: 'plans',
                    id:  planId,
                });
            } catch (error) {
                // Plan không tồn tại, sử dụng plan mặc định
                plan = {
                    id: 'default_plan',
                    name: 'Default Plan',
                    max_duration: 180,
                    max_rooms_per_month: 100,
                    max_minutes_per_month: 5000,
                    price: 0,
                };
            }

            return {
                hasActiveSubscription: true,
                canUpdateMeeting: true,
                subscription: subscription,
                plan: {
                    id: plan.id,
                    name: plan.name,
                    maxDuration: plan.maxDuration,
                },
            };

        } catch (error) {
            console.error('Error in update subscription service:', error);
            // Fallback: cho phép update nếu có lỗi
            return {
                hasActiveSubscription: true,
                canUpdateMeeting: true,
                plan: {
                    maxDuration: 180,
                },
            };
        }
    }
}

export async function POST(request: Request) {
    const payload = await getPayload({ config })

    try {
        // Authentication
        const customer = await authenticateCustomer(request)
        if (!customer) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.UNAUTHORIZED },
                { status: HTTP_STATUS.UNAUTHORIZED }
            )
        }

        console.log('Customer authenticated for update:', customer.id);

        // Check subscription for update permission
        let subscriptionCheck;
        try {
            subscriptionCheck = await UpdateSubscriptionService.checkUserSubscription(customer.id);
            console.log('Update subscription check:', subscriptionCheck);

            if (!subscriptionCheck.hasActiveSubscription) {
                return NextResponse.json(
                    { error: ERROR_MESSAGES.SUBSCRIPTION_REQUIRED },
                    { status: HTTP_STATUS.PAYMENT_REQUIRED }
                )
            }

            if (!subscriptionCheck.canUpdateMeeting) {
                return NextResponse.json(
                    {
                        error: ERROR_MESSAGES.SUBSCRIPTION_LIMIT,
                        limitations: subscriptionCheck.limitations
                    },
                    { status: HTTP_STATUS.FORBIDDEN }
                )
            }
        } catch (error: any) {
            console.error('Error in subscription check for update:', error);
            // Continue with default subscription for update
            subscriptionCheck = {
                hasActiveSubscription: true,
                canUpdateMeeting: true,
                plan: {
                    maxDuration: 180,
                },
            };
        }

        // Token validation
        const formData = await request.formData()
        const token = formData.get('token') as string

        if (!token) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.TOKEN_REQUIRED },
                { status: HTTP_STATUS.BAD_REQUEST }
            )
        }

        // JWT verification
        const privateKey = process.env.JWT_PRIVATE_KEY
        if (!privateKey) {
            console.error('JWT_PRIVATE_KEY is not configured')
            return NextResponse.json(
                { error: ERROR_MESSAGES.SERVER_CONFIG_ERROR },
                { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
            )
        }

        let decoded: DecodedToken
        try {
            decoded = jwt.verify(token, privateKey) as DecodedToken
            let duration: number | undefined = undefined;
            if (decoded.beginTime && decoded.endTime) {
                const beginTime = parseInt(decoded.beginTime);
                const endTime = parseInt(decoded.endTime);
                duration = Math.round((endTime - beginTime) / (1000 * 60));
            }

            console.log('Decoded token for update:', {
                title: decoded.title,
                roomUUID: decoded.roomUUID,
                beginTime: decoded.beginTime,
                endTime: decoded.endTime,
                duration: duration
            });
        } catch (jwtError) {
            console.error('JWT verification failed:', jwtError)
            return NextResponse.json(
                { error: ERROR_MESSAGES.INVALID_TOKEN },
                { status: HTTP_STATUS.BAD_REQUEST }
            )
        }

        // Validate required fields
        if (!decoded.title) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.MEETING_NAME_REQUIRED },
                { status: HTTP_STATUS.BAD_REQUEST }
            )
        }

        // Find meeting
        const meetings = await payload.find({
            collection: 'meetings',
            where: {
                flat_room_id: {
                    equals: decoded.roomUUID
                }
            },
            limit: 1
        })

        if (meetings.docs.length === 0) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.MEETING_NOT_FOUND },
                { status: HTTP_STATUS.NOT_FOUND }
            )
        }

        const meeting = meetings.docs[0]
        console.log('Found meeting for update:', meeting.id);

        // Check ownership
        const ownerCheck = await checkMeetingOwner(decoded.roomUUID, customer.id)
        if (!ownerCheck.exists) {
            return NextResponse.json(
                { error: ERROR_MESSAGES.NO_PERMISSION },
                { status: HTTP_STATUS.NOT_FOUND }
            )
        }

        // Validate time and duration if provided
        if (decoded.beginTime && decoded.endTime) {
            const beginTime = parseInt(decoded.beginTime);
            const endTime = parseInt(decoded.endTime);

            console.log('Time validation for update:', {
                beginTime,
                endTime,
                beginTimeDate: new Date(beginTime),
                endTimeDate: new Date(endTime)
            });

            // Validate dates
            if (isNaN(beginTime) || isNaN(endTime)) {
                return NextResponse.json(
                    { error: ERROR_MESSAGES.TIME_VALIDATION_FAILED + ': Invalid start or end time' },
                    { status: HTTP_STATUS.BAD_REQUEST }
                )
            }

            if (beginTime >= endTime) {
                return NextResponse.json(
                    { error: ERROR_MESSAGES.TIME_VALIDATION_FAILED + ': End time must be after start time' },
                    { status: HTTP_STATUS.BAD_REQUEST }
                )
            }

            // Calculate new duration
            const newDuration = Math.round((endTime - beginTime) / (1000 * 60));
            console.log('New duration calculation:', {
                newDuration,
                maxDuration: subscriptionCheck.plan?.maxDuration
            });

            // Check duration against subscription limits
            const maxDuration = subscriptionCheck.plan?.maxDuration;
            if (newDuration > maxDuration) {
                return NextResponse.json(
                    {
                        error: `${ERROR_MESSAGES.DURATION_EXCEEDED} (${newDuration} > ${maxDuration} minutes)`,
                        maxDuration: maxDuration,
                        requestedDuration: newDuration
                    },
                    { status: HTTP_STATUS.BAD_REQUEST }
                )
            }

            if (endTime - beginTime > 24 * 60 * 60 * 1000) {
                return NextResponse.json(
                    { error: ERROR_MESSAGES.TIME_VALIDATION_FAILED + ': Meeting duration cannot exceed 24 hours' },
                    { status: HTTP_STATUS.BAD_REQUEST }
                )
            }
        }

        // Prepare users data
        let usersData = undefined;
        if (decoded.users && Array.isArray(decoded.users)) {
            usersData = decoded.users.map((email: string) => ({
                email: email.trim()
            }));
        }

        // Calculate duration if times are provided
        let calculatedDuration = undefined;
        if (decoded.beginTime && decoded.endTime) {
            const beginTime = parseInt(decoded.beginTime);
            const endTime = parseInt(decoded.endTime);
            calculatedDuration = Math.round((endTime - beginTime) / (1000 * 60));
        }

        // FIXED: Convert null to undefined for Payload CMS
        const dataToUpdate: UpdateMeetingData = {
            name: decoded.title,
            // Convert null/undefined to undefined explicitly
            start_time: decoded.beginTime ? new Date(parseInt(decoded.beginTime)).toISOString() : undefined,
            end_time: decoded.endTime ? new Date(parseInt(decoded.endTime)).toISOString() : undefined,
            duration: calculatedDuration || (decoded.duration ? parseInt(decoded.duration) : undefined),
        }

        // Only add users if defined
        if (usersData !== undefined) {
            dataToUpdate.users = usersData;
        }

        // FIXED: Remove null/undefined values from update data
        const sanitizedData = Object.fromEntries(
            Object.entries(dataToUpdate).filter(([_, value]) => value !== null && value !== undefined)
        );

        console.log('Data to update:', sanitizedData);

        // Update meeting with sanitized data
        const updatedMeeting = await payload.update({
            collection: 'meetings',
            id: meeting.id,
            data: sanitizedData,
        })

        console.log('Meeting updated successfully:', updatedMeeting.id);

        // Update Flat room
        try {
            console.log('Updating Flat room...');
            const flatRoomResponse = await flatService.updateRoomWithToken(token)
            console.log('Flat room update response:', flatRoomResponse)

            if (flatRoomResponse.status === 0) {
                console.log('Flat room updated successfully')
            } else {
                console.warn('Flat room update returned non-zero status:', flatRoomResponse)
            }
        } catch (flatError) {
            console.error('Failed to update Flat room:', flatError)
            // Continue execution as meeting was updated successfully
            // Log but don't fail the request
        }

        return NextResponse.json({
            success: true,
            data: {
                meeting: updatedMeeting,
                // subscription: {
                //     maxDuration: subscriptionCheck.plan?.maxDuration
                // }
            }
        }, { status: HTTP_STATUS.OK })

    } catch (error: any) {
        console.error(`Error updating meeting: ${error.message}`)

        // Log additional context for debugging
        if (error.stack) {
            console.error('Stack trace:', error.stack)
        }

        return NextResponse.json(
            {
                error: ERROR_MESSAGES.UPDATE_FAILED,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        )
    }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
