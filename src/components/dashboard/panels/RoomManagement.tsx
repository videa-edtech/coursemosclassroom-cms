// components/RoomManagement.tsx
'use client';

import { useState, useEffect } from 'react';
import { FlatUser } from '@/services/flat/types';
import { flatService } from '@/services/flat';
import { RoomItem } from '@/services/flat/types';
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionService, SubscriptionCheck } from '@/services/subscription';
import { generateClientKey } from '../../../../src/services/flat/utils/crypto';

interface RoomManagementProps {
    user: FlatUser;
    customerId: any;
}

interface CreateRoomForm {
    title: string;
    beginTime: string;
    endTime: string;
    email: string;
}

// Thêm interface cho Bill Summary
interface BillSummary {
    total: number;
    list: Array<{
        room_uuid: string;
        room_title: string;
        begin_time: string;
        end_time: string;
        duration_minutes: string;
        room_type: string;
        room_status: string;
        user_uuid: string;
        user_name: string;
    }>;
    page: number;
    limit: number;
    totalDurationMinutes: number;
    averageDurationMinutes: number;
    totalRooms: number;
    uniqueUsers: number;
    byRoomType: Record<string, number>;
}

// Thêm interface cho Usage Summary
interface UsageSummary {
    totalMinutes: number;
    totalRooms: number;
    remainingMinutes: number;
    remainingRooms: number;
    maxMinutesPerMonth: number;
    maxRoomsPerMonth: number;
    maxDurationPerRoom: number;
    billData?: BillSummary;
}

enum RoomStatus {
    Idle = "Idle",
    Started = "Started",
    Stopped = "Stopped",
    Cancelled = "Cancelled"
}

type TabType = 'all' | RoomStatus;

const RoomManagement: React.FC<RoomManagementProps> = ({ user, customerId }) => {
    const flatUser = JSON.parse(localStorage.getItem('flatUser') || '{}');
    const [formData, setFormData] = useState<CreateRoomForm>({
        title: '',
        beginTime: '',
        endTime: '',
        email: user?.email || ''
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isStopping, setIsStopping] = useState<string | null>(null);
    const [createdRoom, setCreatedRoom] = useState<any>(null);
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<RoomItem[]>([]);
    const [totalRooms, setTotalRooms] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');

    // Thêm state cho bill summary
    const [billSummary, setBillSummary] = useState<BillSummary | null>(null);
    const [isLoadingBill, setIsLoadingBill] = useState(false);

    // Thêm state cho usage summary thực tế
    const [realUsageSummary, setRealUsageSummary] = useState<UsageSummary | null>(null);

    // Subscription state
    const [subscriptionCheck, setSubscriptionCheck] = useState<SubscriptionCheck | null>(null);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

    // Check subscription on component mount
    useEffect(() => {
        checkSubscription();
    }, [customerId]);

    // Fetch rooms and check subscription
    useEffect(() => {
        if (subscriptionCheck?.hasActiveSubscription) {
            fetchUserRooms();
        }
    }, [user.token, currentPage, subscriptionCheck]);

    // Fetch bill summary thực tế
    useEffect(() => {
        if (subscriptionCheck?.hasActiveSubscription && user?.token) {
            fetchRealUsageSummary();
        }
    }, [user.token, subscriptionCheck]);

    // Filter rooms
    useEffect(() => {
        if (activeTab === 'all') {
            setFilteredRooms(rooms);
        } else {
            setFilteredRooms(rooms.filter(room => getRoomStatus(room) === activeTab));
        }
    }, [rooms, activeTab]);

    // Set email
    useEffect(() => {
        if (user?.email) {
            setFormData(prev => ({
                ...prev,
                email: user.email
            }));
        }
    }, [user.email]);

    // Hàm lấy tổng số phút thực tế từ bill
    const fetchRealUsageSummary = async () => {
        if (!user?.token) return;

        setIsLoadingBill(true);
        setError('');
        try {
            // Lấy bill summary tháng hiện tại
            const currentMonthSummary = await flatService.getCurrentMonthBillSummary(user.token);
            setBillSummary(currentMonthSummary);

            // Tính toán usage summary dựa trên subscription plan và bill thực tế
            const maxMinutesPerMonth = subscriptionCheck?.plan?.maxMinutesPerMonth || 0;
            const maxRoomsPerMonth = subscriptionCheck?.plan?.maxRoomsPerMonth || 0;
            const maxDurationPerRoom = subscriptionCheck?.plan?.maxDuration || 0;

            const totalMinutes = currentMonthSummary.totalDurationMinutes;
            const totalRoomsCount = currentMonthSummary.totalRooms;

            const realUsage: UsageSummary = {
                totalMinutes,
                totalRooms: totalRoomsCount,
                remainingMinutes: Math.max(0, maxMinutesPerMonth - totalMinutes),
                remainingRooms: Math.max(0, maxRoomsPerMonth - totalRoomsCount),
                maxMinutesPerMonth,
                maxRoomsPerMonth,
                maxDurationPerRoom,
                billData: currentMonthSummary
            };

            setRealUsageSummary(realUsage);
            // Update subscription usage
            await SubscriptionService.updateUsage(
                subscriptionCheck?.subscription?.id.toString(),
                totalMinutes,
                0,
                totalRoomsCount
            );
            console.log('Real usage summary:', realUsage);

        } catch (error: any) {
            console.error('Error fetching real usage summary:', error);
            // Nếu không lấy được bill, dùng subscription usage
            if (subscriptionCheck?.usage) {
                setRealUsageSummary({
                    totalMinutes: subscriptionCheck.usage.totalMinutes || 0,
                    totalRooms: subscriptionCheck.usage.roomsCreated || 0,
                    remainingMinutes: subscriptionCheck.usage.remainingMinutes || 0,
                    remainingRooms: subscriptionCheck.usage.remainingRooms || 0,
                    maxMinutesPerMonth: subscriptionCheck.usage.maxMinutesPerMonth || 0,
                    maxRoomsPerMonth: subscriptionCheck.usage.maxRoomsPerMonth || 0,
                    maxDurationPerRoom: subscriptionCheck.usage.maxDurationPerRoom || 0
                });
            }
        } finally {
            setIsLoadingBill(false);
        }
    };

    const checkSubscription = async () => {
        if (!customerId) return;

        setIsCheckingSubscription(true);
        setError('');
        try {
            const check = await SubscriptionService.checkUserSubscription(customerId);
            setSubscriptionCheck(check);

            if (!check.hasActiveSubscription) {
                setError('You need an active subscription to create rooms. Please subscribe to a plan first.');
            } else if (!check.canCreateRoom) {
                setError(`Cannot create room: ${check.limitations?.join(', ')}. Please upgrade your plan.`);
            }
        } catch (error: any) {
            console.error('Error checking subscription:', error);
            setError('Failed to check subscription status');
        } finally {
            setIsCheckingSubscription(false);
        }
    };

    const fetchUserRooms = async () => {
        if (!user?.token || !subscriptionCheck?.hasActiveSubscription) return;

        setIsLoading(true);
        setError('');
        try {
            const roomData = await flatService.getUserRooms(user.token, currentPage, 50);
            setRooms(roomData.list);
            setTotalRooms(roomData.total);
        } catch (error: any) {
            console.error('Error fetching rooms:', error);
            setError('Failed to load rooms');
        } finally {
            setIsLoading(false);
        }
    };

    // Hàm refresh toàn bộ dữ liệu
    const handleRefreshAll = async () => {
        setError('');
        setSuccessMessage('');

        try {
            // Refresh subscription status
            await checkSubscription();

            // Chỉ refresh rooms và usage nếu có subscription active
            if (subscriptionCheck?.hasActiveSubscription) {
                // Refresh rooms và usage summary song song
                await Promise.all([
                    fetchUserRooms(),
                    fetchRealUsageSummary()
                ]);
                // setSuccessMessage('Data refreshed successfully!');
            }
        } catch (error: any) {
            console.error('Error refreshing data:', error);
            setError('Failed to refresh data');
        }
    };

    const handleStopRoom = async (roomUUID: string, roomTitle: string) => {
        if (!user?.token) {
            setError('User information not found');
            return;
        }

        if (!confirm(`Are you sure you want to stop the meeting "${roomTitle}"?`)) {
            return;
        }

        setIsStopping(roomUUID);
        setError('');
        setSuccessMessage('');

        try {
            await flatService.stopRoom(roomUUID, user.token);
            setSuccessMessage(`Meeting "${roomTitle}" has been stopped successfully!`);
            await fetchUserRooms();
            // Refresh bill summary sau khi stop room
            await fetchRealUsageSummary();
        } catch (error: any) {
            console.error('Error stopping room:', error);
            setError(`Failed to stop meeting "${roomTitle}": ${error.message}`);
        } finally {
            setIsStopping(null);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const dateTimeToTimestamp = (dateTimeString: string): number => {
        return new Date(dateTimeString).getTime();
    };

    const calculateDuration = (beginTime: string, endTime: string): number => {
        return (dateTimeToTimestamp(endTime) - dateTimeToTimestamp(beginTime)) / (60 * 1000);
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check subscription first
        if (!subscriptionCheck?.canCreateRoom) {
            setError('Cannot create room due to subscription limitations. Please check your plan.');
            return;
        }

        if (!formData.title.trim()) {
            setError('Please enter room title');
            return;
        }

        if (!formData.beginTime || !formData.endTime) {
            setError('Please select both start and end time');
            return;
        }

        if (!formData.email) {
            setError('Please enter email');
            return;
        }

        const beginTime = dateTimeToTimestamp(formData.beginTime);
        const endTime = dateTimeToTimestamp(formData.endTime);
        const duration = calculateDuration(formData.beginTime, formData.endTime);

        if (beginTime >= endTime) {
            setError('End time must be after start time');
            return;
        }

        // Kiểm tra với usage thực tế
        if (realUsageSummary) {
            if (duration > realUsageSummary.maxDurationPerRoom) {
                setError(`Room duration cannot exceed ${realUsageSummary.maxDurationPerRoom} minutes according to your plan`);
                return;
            }

            // Check monthly minutes quota thực tế từ bill
            if (duration > realUsageSummary.remainingMinutes) {
                setError(`Room duration (${duration} minutes) exceeds your remaining monthly quota (${realUsageSummary.remainingMinutes} minutes)`);
                return;
            }

            // Check monthly rooms quota thực tế từ bill
            if (realUsageSummary.remainingRooms <= 0) {
                setError(`You have reached your monthly rooms limit (${realUsageSummary.maxRoomsPerMonth} rooms)`);
                return;
            }
        } else {
            // Fallback dùng subscription check cũ
            const maxDuration = subscriptionCheck.plan?.maxDuration || 0;
            if (duration > maxDuration) {
                setError(`Room duration cannot exceed ${subscriptionCheck.plan?.maxDuration} minutes according to your plan`);
                return;
            }

            // Check monthly minutes quota
            const remainingMinutes = subscriptionCheck.usage?.remainingMinutes || 0;
            if (duration > remainingMinutes) {
                setError(`Room duration (${duration} minutes) exceeds your remaining monthly quota (${remainingMinutes} minutes)`);
                return;
            }
        }

        if (endTime - beginTime > 24 * 60 * 60 * 1000) {
            setError('Room duration cannot exceed 24 hours');
            return;
        }

        if (beginTime < Date.now()) {
            setError('Start time cannot be in the past');
            return;
        }

        setIsCreating(true);
        setError('');
        setSuccessMessage('');
        try {
            // Create room in Flat
            const room = await flatService.createRoom(
                {
                    title: formData.title,
                    type: 'SmallClass',
                    beginTime: beginTime,
                    endTime: endTime,
                    email: formData.email
                },
                {
                    flatUser
                }
            );

            if (room.data.roomUUID) {
                // Create meeting record in Payload
                await fetch('/api/meetings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        customer: parseInt(customerId),
                        subscription: subscriptionCheck.subscription?.id,
                        name: formData.title,
                        flat_room_id: room.data.roomUUID,
                        flat_room_link: `${process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL}/join/${room.data.roomUUID}`,
                        start_time: formData.beginTime,
                        end_time: formData.endTime,
                        duration: duration,
                        participants_count: 0,
                        status: 'scheduled',
                        users: [{ email: formData.email }]
                    }),
                });

                setCreatedRoom(room.data);
                setFormData({
                    title: '',
                    beginTime: '',
                    endTime: '',
                    email: user?.email || ''
                });
                setShowCreateForm(false);
                setSuccessMessage('Room created successfully!');

                // Refresh subscription check, rooms, và bill summary
                await checkSubscription();
                await fetchUserRooms();
                await fetchRealUsageSummary();
            } else {
                setError('Failed to create room: ' + JSON.stringify(room));
            }

        } catch (error: any) {
            console.error('Error creating room:', error);
            setError('Failed to create room: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoomStatus = (room: RoomItem): RoomStatus => {
        if (room.is_delete === 1 && room.room_status === RoomStatus.Idle) {
            return RoomStatus.Cancelled;
        }
        return room.room_status as RoomStatus;
    };

    const getRoomStatusBadge = (room: RoomItem) => {
        const status = getRoomStatus(room);

        const statusConfig = {
            [RoomStatus.Idle]: { color: 'bg-gray-100 text-gray-800', label: 'Idle' },
            [RoomStatus.Started]: { color: 'bg-green-100 text-green-800', label: 'Started' },
            [RoomStatus.Stopped]: { color: 'bg-red-100 text-red-800', label: 'Stopped' },
            [RoomStatus.Cancelled]: { color: 'bg-yellow-100 text-yellow-800', label: 'Cancelled' }
        };

        const config = statusConfig[status] || statusConfig[RoomStatus.Idle];
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const joinRoom = async (roomUUID: string) => {
        try {
            // Gọi API để lấy token
            const response = await fetch('/dashboard-api/room-management/create-join-room-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    roomUUID,
                    email: flatUser.email,
                    clientKey: generateClientKey(flatUser.clientKey)
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Mở URL với token
                window.open(result.joinUrl, '_blank');
            } else {
                console.error('Failed to get join token:', result);
            }

        } catch (error) {
            console.error('Error joining room:', error);
            // Fallback khi có lỗi
            const fallbackUrl = `${process.env.NEXT_PUBLIC_FLAT_CMS_BASE_URL}/join/${roomUUID}?email=${encodeURIComponent(flatUser.email)}&clientKey=${flatUser.clientKey}`;
            window.open(fallbackUrl, '_blank');
        }
    };

    const getDefaultStartTime = () => {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        return now.toISOString().slice(0, 16);
    };

    const getDefaultEndTime = () => {
        const twoHoursLater = new Date();
        twoHoursLater.setHours(twoHoursLater.getHours() + 2);
        twoHoursLater.setMinutes(0, 0, 0);
        return twoHoursLater.toISOString().slice(0, 16);
    };

    const canJoinRoom = (room: RoomItem) => {
        const status = getRoomStatus(room);
        const now = new Date();
        const endTime = new Date(room.end_time);
        return status !== RoomStatus.Stopped &&
            status !== RoomStatus.Cancelled &&
            now < endTime;
    };

    const canStopRoom = (room: RoomItem) => {
        const status = getRoomStatus(room);
        return status === RoomStatus.Started;
    };

    const getRoomCountByStatus = (status: TabType) => {
        if (status === 'all') return totalRooms;
        return rooms.filter(room => getRoomStatus(room) === status).length;
    };

    // Cập nhật hàm renderSubscriptionInfo để hiển thị quota thực tế
    const renderSubscriptionInfo = () => {
        // Nếu đang loading bill
        if (isLoadingBill) {
            return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Loading Usage Statistics...
                            </h3>
                            <p className="text-gray-600 mt-1">
                                Fetching real usage data from bills...
                            </p>
                        </div>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            );
        }

        if (!subscriptionCheck?.hasActiveSubscription) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-800">
                                Subscription Required
                            </h3>
                            <p className="text-yellow-700 mt-1">
                                You need an active subscription to create meeting rooms.
                            </p>
                        </div>
                        <button
                            onClick={() => window.open('/pricing', '_blank')}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            View Plans
                        </button>
                    </div>
                </div>
            );
        }

        // Sử dụng realUsageSummary nếu có
        const usage = realUsageSummary || {
            totalMinutes: subscriptionCheck.usage?.totalMinutes || 0,
            totalRooms: subscriptionCheck.usage?.roomsCreated || 0,
            remainingMinutes: subscriptionCheck.usage?.remainingMinutes || 0,
            remainingRooms: subscriptionCheck.usage?.remainingRooms || 0,
            maxMinutesPerMonth: subscriptionCheck.usage?.maxMinutesPerMonth || 0,
            maxRoomsPerMonth: subscriptionCheck.usage?.maxRoomsPerMonth || 0,
            maxDurationPerRoom: subscriptionCheck.usage?.maxDurationPerRoom || 0
        };

        const hasExceededLimits =
            (usage.maxRoomsPerMonth > 0 && usage.remainingRooms <= 0) ||
            (usage.maxMinutesPerMonth > 0 && usage.remainingMinutes <= 0.5);

        if (!subscriptionCheck.canCreateRoom || hasExceededLimits) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-red-800">
                                {hasExceededLimits ? 'Usage Limits Reached' : 'Plan Limit Reached'}
                            </h3>
                            <p className="text-red-700 mt-1">
                                {hasExceededLimits
                                    ? 'You have reached your monthly usage limits.'
                                    : subscriptionCheck.limitations?.join(', ')}
                            </p>
                            <div className="text-red-600 text-sm mt-2 space-y-1">
                                <p>Rooms used: {usage.totalRooms} / {usage.maxRoomsPerMonth}</p>
                                <p>Minutes used: {usage.totalMinutes.toFixed(2)} / {usage.maxMinutesPerMonth}</p>
                                {billSummary && (
                                    <p className="text-xs text-gray-600 mt-2">
                                        Based on actual usage for current month
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => window.open('/pricing', '_blank')}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            {hasExceededLimits ? 'Upgrade Plan' : 'Manage Plan'}
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-green-800">
                                {subscriptionCheck.plan?.name} Plan
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleRefreshAll}
                                    disabled={isLoadingBill || isLoading}
                                    className="text-xs text-green-600 hover:text-green-800 underline"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Rooms Progress Bar */}
                            <div>
                                <div className="flex justify-between text-sm text-green-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>Rooms Usage</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                            {usage.remainingRooms} remaining
                                        </span>
                                    </div>
                                    <span className="font-medium">{usage.totalRooms} / {usage.maxRoomsPerMonth}</span>
                                </div>
                                <div className="w-full bg-green-200 rounded-full h-2.5">
                                    <div
                                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${Math.min(
                                                (usage.totalRooms / usage.maxRoomsPerMonth) * 100,
                                                100
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Minutes Progress Bar */}
                            <div>
                                <div className="flex justify-between text-sm text-green-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span>Minutes Usage</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                            {usage.remainingMinutes.toFixed(0)} remaining
                                        </span>
                                    </div>
                                    <span className="font-medium">{usage.totalMinutes.toFixed(2)} / {usage.maxMinutesPerMonth}</span>
                                </div>
                                <div className="w-full bg-green-200 rounded-full h-2.5">
                                    <div
                                        className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${Math.min(
                                                (usage.totalMinutes / usage.maxMinutesPerMonth) * 100,
                                                100
                                            )}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            <p className="text-green-600 text-sm pt-2">
                                <strong>Max duration per room:</strong> {usage.maxDurationPerRoom} minutes
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => window.open('/pricing', '_blank')}
                        className="ml-6 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                        Manage Plan
                    </button>
                </div>
            </div>
        );
    };

    // Cập nhật phần tạo room form để hiển thị quota thực tế
    const renderQuotaInfoInForm = () => {
        if (!realUsageSummary) return null;

        const duration = formData.beginTime && formData.endTime
            ? calculateDuration(formData.beginTime, formData.endTime)
            : 0;

        const isDurationExceeded = duration > realUsageSummary.maxDurationPerRoom;
        const isMinutesExceeded = duration > realUsageSummary.remainingMinutes;
        const isRoomsExceeded = realUsageSummary.remainingRooms <= 0;

        return (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="text-sm text-gray-600">
                    <strong>Room Type:</strong> SmallClass (Fixed)
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Duration:</strong> {formData.beginTime && formData.endTime
                    ? `${Math.round(duration)} minutes`
                    : 'N/A'
                }
                </p>

                {/*<div className="space-y-1 text-sm">*/}
                {/*    <p className="font-medium text-gray-700">Plan Limits (Based on actual usage):</p>*/}

                {/*    <div className={`flex justify-between ${isDurationExceeded ? 'text-red-600' : 'text-gray-600'}`}>*/}
                {/*        <span>• Max duration per room:</span>*/}
                {/*        <span>{realUsageSummary.maxDurationPerRoom} minutes</span>*/}
                {/*    </div>*/}

                {/*    <div className={`flex justify-between ${isMinutesExceeded ? 'text-red-600' : 'text-gray-600'}`}>*/}
                {/*        <span>• Remaining minutes:</span>*/}
                {/*        <span>{realUsageSummary.remainingMinutes.toFixed(0)} minutes</span>*/}
                {/*    </div>*/}

                {/*    <div className={`flex justify-between ${isRoomsExceeded ? 'text-red-600' : 'text-gray-600'}`}>*/}
                {/*        <span>• Remaining rooms:</span>*/}
                {/*        <span>{realUsageSummary.remainingRooms} rooms</span>*/}
                {/*    </div>*/}

                {/*    {billSummary && (*/}
                {/*        <div className="text-xs text-gray-500 pt-1 border-t border-gray-300">*/}
                {/*            <p>Current month: {billSummary.totalRooms} rooms, {billSummary.totalDurationMinutes.toFixed(2)} minutes used</p>*/}
                {/*        </div>*/}
                {/*    )}*/}
                {/*</div>*/}
            </div>
        );
    };

    const tabs = [
        { id: 'all' as TabType, label: 'All Rooms', count: getRoomCountByStatus('all') },
        { id: RoomStatus.Started, label: 'Active', count: getRoomCountByStatus(RoomStatus.Started) },
        { id: RoomStatus.Idle, label: 'Idle', count: getRoomCountByStatus(RoomStatus.Idle) },
        { id: RoomStatus.Stopped, label: 'Stopped', count: getRoomCountByStatus(RoomStatus.Stopped) },
        { id: RoomStatus.Cancelled, label: 'Cancelled', count: getRoomCountByStatus(RoomStatus.Cancelled) },
    ];

    if (isCheckingSubscription) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking subscription status...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Room Management</h2>

            {/* Subscription Info với quota thực tế */}
            {renderSubscriptionInfo()}

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-700">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="space-y-6">
                {/* Create Room Button - Only show if user can create rooms */}
                {!showCreateForm && subscriptionCheck?.canCreateRoom && (
                    <div className="bg-[#fcfcfa] border rounded-lg p-6 text-center">
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors text-lg font-semibold"
                        >
                            + Create New Room
                        </button>
                        <div className="mt-2 text-sm text-gray-600">
                            {realUsageSummary ? (
                                <>
                                    Remaining: {realUsageSummary.remainingRooms} rooms, {realUsageSummary.remainingMinutes.toFixed(0)} minutes
                                    {billSummary && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            (Current month: {billSummary.totalRooms} rooms used)
                                        </span>
                                    )}
                                </>
                            ) : (
                                <span>Loading real-time quota...</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Create Room Form */}
                {showCreateForm && subscriptionCheck?.canCreateRoom && (
                    <div className="bg-[#fcfcfa] border rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Create New Room</h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Room Title *
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        placeholder="Enter room title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="beginTime"
                                        value={formData.beginTime || getDefaultStartTime()}
                                        onChange={handleInputChange}
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Time *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        name="endTime"
                                        value={formData.endTime || getDefaultEndTime()}
                                        onChange={handleInputChange}
                                        min={formData.beginTime || getDefaultStartTime()}
                                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Enter email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Quota Info với dữ liệu thực tế */}
                            {renderQuotaInfoInForm()}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1"
                                >
                                    {isCreating ? 'Creating Room...' : 'Create Room'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Rest of the component remains the same */}
                {/* ... (giữ nguyên phần tabs và room list) ... */}

                {/* Status Tabs */}
                <div className="bg-[#fcfcfa] border rounded-lg">
                    {/* Tabs Header */}
                    <div className="border-b">
                        <div className="flex overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 bg-blue-50'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="font-medium">{tab.label}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                        activeTab === tab.id
                                            ? 'bg-blue-200 text-blue-800'
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6 h-[50vh] overflow-y-scroll">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                {activeTab === 'all' ? 'All Rooms' : `${activeTab} Rooms`}
                                <span className="ml-2 text-sm text-gray-500 font-normal">
                                    ({filteredRooms.length} rooms)
                                </span>
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRefreshAll}
                                    disabled={isLoading || isLoadingBill}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {(isLoading || isLoadingBill) ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Refreshing...
                                        </>
                                    ) : (
                                        'Refresh All'
                                    )}
                                </button>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                <p className="mt-2 text-gray-600">Loading rooms...</p>
                            </div>
                        ) : filteredRooms.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No {activeTab === 'all' ? '' : activeTab.toLowerCase() + ' '}rooms found.</p>
                                {activeTab !== 'all' && (
                                    <button
                                        onClick={() => setActiveTab('all')}
                                        className="text-blue-500 hover:underline mt-2"
                                    >
                                        View all rooms
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredRooms.map((room) => (
                                    <div
                                        key={room.room_uuid}
                                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-lg">{room.title}</h4>
                                                    {getRoomStatusBadge(room)}
                                                    {room.has_record === 1 && (
                                                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                                                            Recorded
                                                        </span>
                                                    )}
                                                    {room.is_ai === 1 && (
                                                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                                    <div>
                                                        <strong>UUID:</strong> {room.room_uuid}
                                                    </div>
                                                    <div>
                                                        <strong>Duration:</strong> {Math.round((new Date(room.end_time).getTime() - new Date(room.begin_time).getTime()) / (60 * 1000))} minutes
                                                    </div>
                                                    <div>
                                                        <strong>Start:</strong> {formatDate(room.begin_time)}
                                                    </div>
                                                    <div>
                                                        <strong>End:</strong> {formatDate(room.end_time)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                {canJoinRoom(room) && (
                                                    <button
                                                        onClick={() => joinRoom(room.room_uuid)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                                                    >
                                                        Join Room
                                                    </button>
                                                )}

                                                {canStopRoom(room) && (
                                                    <button
                                                        onClick={() => handleStopRoom(room.room_uuid, room.title)}
                                                        disabled={isStopping === room.room_uuid}
                                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                                                    >
                                                        {isStopping === room.room_uuid ? 'Stopping...' : 'Stop Meeting'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {activeTab === 'all' && totalRooms > 50 && (
                            <div className="flex justify-between items-center mt-6 pt-4 border-t">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-600">
                                    Page {currentPage} of {Math.ceil(totalRooms / 50)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    disabled={currentPage >= Math.ceil(totalRooms / 50)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomManagement;
