// src/components/dashboard/panels/Settings.tsx
'use client';

import { FlatUser } from '@/services/flat/types';

interface SettingsProps {
    user: FlatUser;
    onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onLogout }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            <div className="space-y-6">
                <div className="bg-[#fcfcfa] border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Account Settings</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                defaultValue={user.name}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                defaultValue={user.email}
                                disabled
                                className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-500"
                            />
                            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#fcfcfa] border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h3>

                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-medium">Logout from all devices</p>
                            <p className="text-sm text-gray-600">
                                This will log you out from all active sessions
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
