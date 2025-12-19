// src/components/dashboard/panels/UserProfile.tsx - Phiên bản đơn giản
'use client';

import { FlatUser } from '@/services/flat/types';
import { useState } from 'react';

interface UserProfileProps {
    user: FlatUser;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    // Hàm ẩn phần giữa của chuỗi
    const maskSensitiveData = (str: string | undefined, visibleChars: number = 4) => {
        if (!str) return 'Not available';

        if (str.length <= visibleChars * 2) {
            return str;
        }

        const start = str.substring(0, visibleChars);
        const end = str.substring(str.length - visibleChars);
        return `${start}••••${end}`;
    };

    const CopyIcon = ({ isCopied }: { isCopied: boolean }) => (
        <svg
            className={`w-4 h-4 ${isCopied ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
        >
            {isCopied ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            )}
        </svg>
    );

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">User Profile</h2>

            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <img
                            src={JSON.parse(localStorage.getItem('flatUser') || '{}').avatar ||
                                JSON.parse(localStorage.getItem('flatUser') || '{}').avatar_url ||
                                ''}
                            alt={user.name}
                            className="w-20 h-20 rounded-full"
                        />
                        <div>
                            <h3 className="text-xl font-semibold">{user.name}</h3>
                            <p className="text-gray-600">{user.email}</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Account Information</h4>
                        <div className="space-y-2 text-sm">
                            {/* User UUID */}
                            <div className="flex justify-between items-center">
                                <span>User UUID:</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">
                                        {maskSensitiveData(user.userUUID)}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(user.userUUID || '', 'uuid')}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                                        title="Copy User UUID"
                                    >
                                        <CopyIcon isCopied={copiedField === 'uuid'} />
                                    </button>
                                </div>
                            </div>

                            {/* Client Key */}
                            <div className="flex justify-between items-center">
                                <span>Client Key:</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs">
                                        {maskSensitiveData(user.clientKey)}
                                    </span>
                                    <button
                                        onClick={() => handleCopy(user.clientKey || '', 'clientKey')}
                                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                                        title="Copy Client Key"
                                    >
                                        <CopyIcon isCopied={copiedField === 'clientKey'} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        {/*<div className="mt-3 pt-3 border-t border-gray-200">*/}
                        {/*    <p className="text-xs text-gray-500">*/}
                        {/*        Sensitive data is masked for security. Click copy icon to copy full value.*/}
                        {/*    </p>*/}
                        {/*</div>*/}
                    </div>

                    {copiedField && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-green-700 text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {copiedField === 'uuid' ? 'User UUID' : 'Client Key'} copied to clipboard!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
