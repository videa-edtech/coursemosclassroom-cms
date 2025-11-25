// src/app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/payload/payloadClient';
import { getPayload } from 'payload';
export async function GET(request: NextRequest) {
    try {
        const payload = await getPayloadClient();
        const { searchParams } = new URL(request.url);

        const where = searchParams.get('where');
        const sort = searchParams.get('sort');
        const limit = searchParams.get('limit');

        let query = {};
        if (where) {
            query = JSON.parse(where);
        }

        const result = await payload.find({
            collection: 'subscriptions',
            where: query,
            sort: sort || '-createdAt',
            limit: limit ? parseInt(limit) : 100,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
export async function POST(request: NextRequest) {
    try {
        const payload = await getPayloadClient();
        const data = await request.json();

        console.log('Received subscription data:', data);

        // Validate required fields
        if (!data.customer || !data.plan) {
            return NextResponse.json(
                { error: 'Customer and Plan are required' },
                { status: 400 }
            );
        }

        // Set current month for monthlyUsage
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Prepare subscription data with proper monthlyUsage
        const subscriptionData = {
            customer: data.customer,
            plan: data.plan,
            startDate: data.startDate || new Date().toISOString(),
            endDate: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: data.status || 'pending',
            autoRenew: data.autoRenew !== undefined ? data.autoRenew : true,
            monthlyUsage: {
                month: currentMonth,
                roomsCreated: 0,
                totalDuration: 0,
                participantsCount: 0,
            },
            usageHistory: [],
        };

        console.log('Creating subscription with data:', subscriptionData);

        const subscription = await payload.create({
            collection: 'subscriptions',
            data: subscriptionData,
        });

        console.log('Subscription created successfully:', subscription.id);

        return NextResponse.json({
            success: true,
            doc: subscription
        });
    } catch (error: any) {
        console.error('Error creating subscription:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
// export async function POST(request: NextRequest) {
//     try {
//         const payload = await getPayloadClient();
//         const data = await request.json();
//
//         const result = await payload.create({
//             collection: 'subscriptions',
//             data,
//         });
//
//         return NextResponse.json({ doc: result });
//     } catch (error) {
//         console.error('Error creating subscription:', error);
//         return NextResponse.json(
//             { error: 'Internal Server Error' },
//             { status: 500 }
//         );
//     }
// }



// // // src/app/api/subscriptions/route.ts
// // import { NextRequest, NextResponse } from 'next/server';
// // import { getPayloadClient } from '@/payload/payloadClient';
// // import { getPayload } from 'payload';
// // export async function GET(request: NextRequest) {
// //     try {
// //         const payload = await getPayloadClient();
// //         const { searchParams } = new URL(request.url);
// //
// //         const where = searchParams.get('where');
// //         const sort = searchParams.get('sort');
// //         const limit = searchParams.get('limit');
// //
// //         let query = {};
// //         if (where) {
// //             query = JSON.parse(where);
// //         }
// //
// //         const result = await payload.find({
// //             collection: 'subscriptions',
// //             where: query,
// //             sort: sort || '-createdAt',
// //             limit: limit ? parseInt(limit) : 100,
// //         });
// //
// //         return NextResponse.json(result);
// //     } catch (error) {
// //         console.error('Error fetching subscriptions:', error);
// //         return NextResponse.json(
// //             { error: 'Internal Server Error' },
// //             { status: 500 }
// //         );
// //     }
// // }
// // export async function POST(request: NextRequest) {
// //     try {
// //         const payload = await getPayloadClient();
// //         const data = await request.json();
// //
// //         const result = await payload.create({
// //             collection: 'subscriptions',
// //             data,
// //         });
// //
// //         return NextResponse.json({ doc: result });
// //     } catch (error) {
// //         console.error('Error creating subscription:', error);
// //         return NextResponse.json(
// //             { error: 'Internal Server Error' },
// //             { status: 500 }
// //         );
// //     }
// // }
// //
// // src/app/api/subscriptions/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { getPayloadClient } from '@/payload/payloadClient';
//
// export async function GET(request: NextRequest) {
//     try {
//         const payload = await getPayloadClient();
//         const { searchParams } = new URL(request.url);
//
//         // Parse query parameters
//         const where = searchParams.get('where');
//         const sort = searchParams.get('sort');
//         const limit = searchParams.get('limit');
//         const page = searchParams.get('page');
//         const depth = searchParams.get('depth');
//         const draft = searchParams.get('draft');
//         const select = searchParams.get('select');
//
//         let query = {};
//         if (where) {
//             try {
//                 query = JSON.parse(where);
//             } catch (e) {
//                 console.error('Error parsing where parameter:', e);
//                 // Nếu không parse được JSON, thử parse từ URL query
//                 try {
//                     const parsedQuery: any = {};
//                     const params = new URLSearchParams(where);
//                     for (const [key, value] of params) {
//                         parsedQuery[key] = value;
//                     }
//                     query = parsedQuery;
//                 } catch (parseError) {
//                     console.error('Error parsing URL query:', parseError);
//                 }
//             }
//         }
//
//         const result = await payload.find({
//             collection: 'subscriptions',
//             where: query,
//             sort: sort || '-createdAt',
//             limit: limit ? parseInt(limit) : 10,
//             page: page ? parseInt(page) : 1,
//             depth: depth ? parseInt(depth) : 0,
//             draft: draft === 'true',
//         });
//
//         return NextResponse.json(result);
//     } catch (error) {
//         console.error('Error fetching subscriptions:', error);
//         return NextResponse.json(
//             { error: 'Internal Server Error' },
//             { status: 500 }
//         );
//     }
// }
//
// export async function POST(request: NextRequest) {
//     try {
//         const payload = await getPayloadClient();
//
//         // Kiểm tra content type
//         const contentType = request.headers.get('content-type');
//
//         let data;
//         if (contentType?.includes('application/json')) {
//             data = await request.json();
//         } else {
//             // Nếu không phải JSON, thử parse từ form data hoặc query string
//             const text = await request.text();
//             try {
//                 data = JSON.parse(text);
//             } catch (e) {
//                 // Nếu không parse được JSON, thử parse từ URL encoded
//                 const params = new URLSearchParams(text);
//                 data = {};
//                 for (const [key, value] of params) {
//                     data[key] = value;
//                 }
//             }
//         }
//
//         console.log('Creating subscription with data:', data);
//
//         // Validate required fields
//         if (!data.customer) {
//             return NextResponse.json(
//                 { error: 'Customer is required' },
//                 { status: 400 }
//             );
//         }
//
//         if (!data.plan) {
//             return NextResponse.json(
//                 { error: 'Plan is required' },
//                 { status: 400 }
//             );
//         }
//
//         if (!data.startDate) {
//             return NextResponse.json(
//                 { error: 'Start date is required' },
//                 { status: 400 }
//             );
//         }
//
//         if (!data.endDate) {
//             return NextResponse.json(
//                 { error: 'End date is required' },
//                 { status: 400 }
//             );
//         }
//
//         const result = await payload.create({
//             collection: 'subscriptions',
//             data: {
//                 ...data,
//                 status: data.status || 'pending',
//                 autoRenew: data.autoRenew !== undefined ? data.autoRenew : true,
//             },
//         });
//
//         return NextResponse.json({ doc: result });
//     } catch (error: any) {
//         console.error('Error creating subscription:', error);
//
//         return NextResponse.json(
//             {
//                 error: 'Failed to create subscription',
//                 details: error.message || 'Unknown error'
//             },
//             { status: 500 }
//         );
//     }
// }
