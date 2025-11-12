import { getPayload } from 'payload'
import config from '@payload-config'

// =================================================================
// Authenticate (cho App Router)
// =================================================================
export const authenticateCustomer = async (request: Request): Promise<any> => {
    const payload = await getPayload({ config })
    const secretKey = request.headers.get('x-secret-key')

    if (!secretKey) {
        return null
    }

    try {
        const foundUsers = await payload.find({
            collection: 'customers',
            where: {
                secret_key: {
                    equals: secretKey,
                },
            },
            limit: 1,
        })

        if (foundUsers.docs.length === 0) {
            return null
        }

        return foundUsers.docs[0]
    } catch (error: any) {
        console.error(`Authentication error: ${error.message}`)
        return null
    }
}

export const checkMeetingOwner = async (meetingId: string, customerId: string): Promise<{
    exists: boolean
    meeting?: any
}> => {
    const payload = await getPayload({ config })

    try {
        const existingMeetings = await payload.find({
            collection: 'meetings',
            where: {
                and: [
                    { id: { equals: meetingId } },
                    { customer_id: { equals: customerId } }
                ]
            },
            limit: 1,
        })

        if (existingMeetings.docs.length === 0) {
            return { exists: false }
        }

        return {
            exists: true,
            meeting: existingMeetings.docs[0]
        }
    } catch (error: any) {
        console.error(`Error checking meeting owner: ${error.message}`)
        return { exists: false }
    }
}
