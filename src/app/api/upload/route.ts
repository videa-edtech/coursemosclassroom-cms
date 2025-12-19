import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Tạo tên file unique (ví dụ thêm timestamp)
        const fileName = `${process.env.AWS_S3_FOLDER}/avatar/${Date.now()}-${file.name}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
            // ACL: 'public-read', // Bỏ comment nếu bucket cho phép ACL public
        });

        await s3Client.send(command);

        // Trả về URL đầy đủ
        const url = `${process.env.AWS_PUBLIC_PREFIX}/${fileName}`;

        return NextResponse.json({ url });
    } catch (error) {
        console.error('S3 Upload Error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
