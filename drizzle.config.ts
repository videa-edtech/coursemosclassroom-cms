import { defineConfig } from 'drizzle-kit';

export default defineConfig({
    schema: './src/payload-types.ts',

    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.DATABASE_URI!,
    },
    verbose: true,
    strict: true,
});
