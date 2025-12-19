// src/components/dashboard/panels/Settings.tsx
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { FlatUser } from '@/services/flat/types';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { flatService } from '@/services/flat';

interface ExtendedUser extends Omit<FlatUser, 'avatar'> {
    avatar?: string;
    avatar_url?: string;  // Add this property
    organization?: string;
    organization_description?: string;
}

interface SettingsProps {
    user: ExtendedUser;
    onLogout: () => void;
    onUpdateUser?: (updatedData: Partial<ExtendedUser>) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onLogout, onUpdateUser }) => {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        organization: '',
        organization_description: '',
        avatar_url: '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                organization: user.organization || '',
                organization_description: user.organization_description || '',
                avatar_url: user.avatar_url || user.avatar || '',  // Now both properties are defined
            });
        }
    }, [user]);

    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, avatar_url: objectUrl }));

        try {
            setUploading(true);
            const data = new FormData();
            data.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: data,
            });

            if (!res.ok) {
                const error = await res.json();
                showToast("Upload failed", error.message, "destructive");
            }

            const result = await res.json();
            setFormData(prev => ({ ...prev, avatar_url: result.url }));
        } catch (error: any) {
            console.error('Upload error:', error);
            showToast("Upload failed", error.message, "destructive");
            setFormData(prev => ({
                ...prev,
                avatar_url: user.avatar_url || user.avatar || ''
            }));
        } finally {
            setUploading(false);
        }
    };

    const showToast = (title: string, description: string, variant: 'default' | 'destructive' = 'default') => {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
            variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`;
        toast.innerHTML = `
            <div class="font-semibold">${title}</div>
            <div class="text-sm">${description}</div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    };

    const handleSaveProfile = async () => {
        let userId;
        try {
            setIsSaving(true);
            try {
                const response = await fetch('/api/customers/find-by-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: user.email }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(data)
                    if (data.customerId) {
                        userId = data.customerId
                    }
                }
            } catch (error) {
                console.error('Error fetching customer ID:', error);
            }
            console.log(userId)
            if (!userId) {
                throw new Error('Can not find user');
            }

            const updateData: any = {
                id: userId,
                name: formData.name,
                organization: formData.organization,
                organization_description: formData.organization_description,
            };

            if (formData.avatar_url && formData.avatar_url !== (user.avatar_url || user.avatar)) {
                updateData.avatar = formData.avatar_url;
            }

            const res = await fetch(`/api/customers/frontend/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            const responseData = await res.json();

            if (!res.ok) {
                if (responseData.errors && responseData.errors.length > 0) {
                    throw new Error(responseData.errors[0].message);
                }
                throw new Error(responseData.message || 'Failed to update profile');
            }
            const response = await flatService.updateInformation(user.userUUID, updateData, user.token);

            if (response.status === 0 && response.data) {
                showToast("Update successfully!", '', 'default');

                const flatUserStr = localStorage.getItem('flatUser');
                let flatUser = flatUserStr ? JSON.parse(flatUserStr) : {};

                // Update information
                flatUser = {
                    ...flatUser,
                    name: formData.name,
                    organization: formData.organization,
                    organization_description: formData.organization_description,
                    avatar_url: formData.avatar_url,
                    avatar: formData.avatar_url,
                    // Keep other information
                    email: flatUser.email || user.email,
                    token: flatUser.token || user.token,
                    userUUID: flatUser.userUUID || user.userUUID,
                    clientKey: flatUser.clientKey || user.clientKey,
                };

                // Save to localStorage
                localStorage.setItem('flatUser', JSON.stringify(flatUser));
                console.log('LocalStorage updated:', flatUser);

                // Refresh data
                router.refresh();
            } else {
                throw new Error('Update failed');
            }

        } catch (error: any) {
            showToast("Error", error.message, "destructive");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Settings</h2>

            <div className="space-y-6">
                {/* Account Settings Section */}
                <div className="bg-[#fcfcfa] border rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-6">Account Settings</h3>

                    {/* Avatar Upload */}
                    <div className="mb-6 flex items-center gap-6">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border bg-gray-100 flex-shrink-0">
                            {formData.avatar_url ? (
                                formData.avatar_url.startsWith('blob:') ? (
                                    // Use Image for blob URL (temporary preview)
                                    <Image
                                        src={JSON.parse(localStorage.getItem('flatUser') || '{}').avatar ||
                                            JSON.parse(localStorage.getItem('flatUser') || '{}').avatar_url ||
                                            ''}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        width={96}
                                        height={96}
                                        unoptimized={true}
                                    />
                                ) : (
                                    // Use img tag for all URLs from external servers
                                    <img
                                        src={JSON.parse(localStorage.getItem('flatUser') || '{}').avatar ||
                                            JSON.parse(localStorage.getItem('flatUser') || '{}').avatar_url ||
                                            ''}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            // Fallback when image fails to load
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                                    {formData.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Profile Picture
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading || isSaving}
                                className="text-sm border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? 'Uploading...' : 'Change Avatar'}
                            </button>
                            <p className="text-xs text-gray-500 mt-2">JPG, GIF or PNG. Max size 2MB</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Display Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isSaving}
                            />
                        </div>

                        {/* Organization */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Organization
                            </label>
                            <input
                                type="text"
                                name="organization"
                                value={formData.organization}
                                onChange={handleInputChange}
                                placeholder="e.g. Acme Corp"
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                disabled={isSaving}
                            />
                        </div>

                        {/* Organization Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Organization Description
                            </label>
                            <textarea
                                name="organization_description"
                                value={formData.organization_description}
                                onChange={handleInputChange}
                                rows={3}
                                placeholder="Brief description about your organization..."
                                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                disabled={isSaving}
                            />
                        </div>

                        {/* Email (Read Only) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                defaultValue={user.email}
                                disabled
                                className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                        </div>

                        {/* Save Button */}
                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSaving}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({
                                        name: user.name || '',
                                        organization: user.organization || '',
                                        organization_description: user.organization_description || '',
                                        avatar_url: user.avatar_url || user.avatar || '',
                                    });
                                }}
                                disabled={isSaving}
                                className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-[#fcfcfa] border rounded-lg p-6 border-red-100">
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
                            disabled={isSaving}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
