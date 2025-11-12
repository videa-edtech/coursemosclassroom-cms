import type { CollectionConfig } from 'payload'
import { randomBytes } from 'crypto'

export const Customers: CollectionConfig = {
    slug: 'customers',
    // Kích hoạt tính năng xác thực cho collection này
    auth: {
        // Không cho phép user tự đăng ký qua API (chỉ admin hoặc API Moodle)
        disableLocalStrategy: false,
        verify: false, // Tắt xác thực email (có thể bật nếu cần)
    },
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'email', 'organization'],
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
        },
        // email đã được thêm tự động vì auth: true
        // password đã được thêm tự động vì auth: true
        {
            name: 'email_verified_at',
            type: 'date',
            admin: {
                readOnly: true,
            },
        },
        {
            name: 'phone',
            type: 'text',
        },
        {
            name: 'avatar',
            type: 'upload',
            relationTo: 'media', // Giả sử bạn có 1 collection 'media'
        },
        {
            name: 'organization',
            type: 'text',
        },
        {
            name: 'organization_description',
            type: 'textarea',
        },
        {
            name: 'secret_key',
            type: 'text',
            unique: true,
            index: true,
            admin: {
                readOnly: true,
                position: 'sidebar',
            },
        },
    ],
    hooks: {
        // Tự động sinh secret_key trước khi tạo user
        beforeChange: [
            ({ data, operation }) => {
                if (operation === 'create' && !data.secret_key) {
                    data.secret_key = randomBytes(32).toString('hex')
                }
                return data
            },
        ],
    },
}

