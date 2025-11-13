// src/app/(frontend)/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const router = useRouter();

    // Chuyển hướng về login nếu chưa đăng nhập
    useEffect(() => {
        if (!user?.token) {
            router.push('/login');
        }
    }, [user, router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!user?.token) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <div className="flex items-center gap-4">
                        <span>Xin chào, {user.name}</span>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Thông tin user */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Thông tin tài khoản</h2>
                        <div className="space-y-2">
                            <p><strong>Name:</strong> {user.name}</p>
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>User UUID:</strong> {user.userUUID}</p>
                            <p><strong>Token:</strong> {user.token.substring(0, 20)}...</p>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                            <button className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
                                Tạo phòng mới
                            </button>
                            <button className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600">
                                Danh sách phòng
                            </button>
                        </div>
                    </div>

                    {/* Session info */}
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-4">Session Info</h2>
                        <div className="space-y-2">
                            <p><strong>Has Phone:</strong> {user.hasPhone ? 'Yes' : 'No'}</p>
                            <p><strong>Has Password:</strong> {user.hasPassword ? 'Yes' : 'No'}</p>
                            <p><strong>Is Anonymous:</strong> {user.isAnonymous ? 'Yes' : 'No'}</p>
                            <p><strong>Client Key:</strong> {user.clientKey}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
