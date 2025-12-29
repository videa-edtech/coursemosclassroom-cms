// src/components/payload/CustomerAnalytics.tsx
'use client'
import "@/styles/globals.css";
import React, { useState, useEffect } from 'react'
import { useFormFields, Button } from '@payloadcms/ui'
import { getAdminRoomsAction, getRoomDetailAction } from '@/actions/flatActions'

interface RoomItem {
    roomUUID: string
    title: string
    beginTime: string
    endTime: string
    roomStatus: string
    duration: number // tính bằng phút
    participants?: number
}

interface RoomWithDetails {
    roomUUID: string
    title: string
    beginTime: string
    endTime: string
    roomStatus: string
    duration: number
    participants: number
    participantsData?: any[]
}

interface UserInOutRecord {
    created_at: string
    updated_at: string
    room_uuid: string
    user_uuid: string
    time_in: string
    time_out: string | null
    is_delete: number
    room_title: string
    user_name: string
    duration_minutes: number
}

interface RoomDetailModalProps {
    room: RoomWithDetails
    onClose: () => void
    token: string | null
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose, token }) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [userInOutData, setUserInOutData] = useState<UserInOutRecord[]>([])
    const [activeTab, setActiveTab] = useState<'details' | 'participants'>('details')
    const [participants, setParticipants] = useState<any[]>([])

    useEffect(() => {
        if (room && token) {
            fetchRoomDetails()
        }
    }, [room.roomUUID, token])

    const fetchRoomDetails = async () => {
        if (!token) return

        try {
            setLoading(true)
            setError(null)

            // Fetch room detail with participants
            const result = await getRoomDetailAction(room.roomUUID, token)
            if (result.success) {
                // Set participants data
                if (result.data?.participants && Array.isArray(result.data.participants)) {
                    setParticipants(result.data.participants)
                }

                if (result.data?.userInOut) {
                    let userInOutArray: any[] = [];

                    if (result.data.userInOut.records && Array.isArray(result.data.userInOut.records)) {
                        userInOutArray = result.data.userInOut.records;
                    }
                    else if (Array.isArray(result.data.userInOut)) {
                        userInOutArray = result.data.userInOut;
                    }
                    else if (result.data.userInOut.data && Array.isArray(result.data.userInOut.data)) {
                        userInOutArray = result.data.userInOut.data;
                    }
                    else if (result.data.userInOut.items && Array.isArray(result.data.userInOut.items)) {
                        userInOutArray = result.data.userInOut.items;
                    }
                    else if (result.data.userInOut.list && Array.isArray(result.data.userInOut.list)) {
                        userInOutArray = result.data.userInOut.list;
                    }
                    else if (result.data.userInOut.results && Array.isArray(result.data.userInOut.results)) {
                        userInOutArray = result.data.userInOut.results;
                    }

                    if (userInOutArray.length > 0) {
                        const processedData = userInOutArray.map((item: any) => {
                            // Tính duration nếu có time_in và time_out
                            let duration_minutes = item.duration_minutes || 0;
                            if (!duration_minutes && item.time_in && item.time_out) {
                                try {
                                    const timeIn = new Date(item.time_in).getTime();
                                    const timeOut = new Date(item.time_out).getTime();
                                    if (!isNaN(timeIn) && !isNaN(timeOut) && timeOut > timeIn) {
                                        duration_minutes = Math.floor((timeOut - timeIn) / (1000 * 60));
                                    }
                                } catch (e) {
                                    // Bỏ qua lỗi tính duration
                                    console.warn('Error calculating duration:', e);
                                }
                            }

                            return {
                                created_at: item.created_at || new Date().toISOString(),
                                updated_at: item.updated_at || new Date().toISOString(),
                                room_uuid: item.room_uuid || item.roomUuid || room.roomUUID,
                                user_uuid: item.user_uuid || item.userUuid || item.user_id || '',
                                time_in: item.time_in || item.timeIn || item.join_time || '',
                                time_out: item.time_out || item.timeOut || item.leave_time || null,
                                is_delete: item.is_delete || item.isDelete || 0,
                                room_title: item.room_title || item.roomTitle || room.title,
                                user_name: item.user_name || item.userName || item.name ||
                                    `User ${(item.user_uuid || item.userUuid || '').substring(0, 8)}`,
                                duration_minutes: duration_minutes
                            };
                        });

                        setUserInOutData(processedData);
                    } else {
                        setUserInOutData([]);
                    }
                } else {
                    setUserInOutData([]);
                }

            } else {
                setError(result.error || 'Failed to load room details')
            }
        } catch (err: any) {
            console.error('Error fetching room details:', err)
            setError('Failed to load room details: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const formatDateTime = (dateString: string): string => {
        try {
            const date = new Date(dateString)
            if (isNaN(date.getTime())) return 'Invalid Date'

            return date.toLocaleString('vi-VN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        } catch {
            return dateString
        }
    }

    const formatDuration = (minutes: number): string => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
            return `${hours}h ${mins}m`
        }
        return `${mins}m`
    }

    const calculateStats = () => {
        const totalUsers = userInOutData.length
        const activeUsers = userInOutData.filter(user => user.time_out === null).length
        const totalDuration = userInOutData.reduce((sum, user) => sum + (user.duration_minutes || 0), 0)
        const averageDuration = totalUsers > 0 ? Math.round(totalDuration / totalUsers) : 0

        return {
            totalUsers,
            activeUsers,
            totalDuration,
            averageDuration
        }
    }

    const stats = calculateStats()

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
            <div className="bg-[#fcfcfa] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{room.title} <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm ml-2">
                            {room.roomStatus}
                        </span></h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Room ID: {room.roomUUID}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b px-6 pt-4">
                        <div className="flex space-x-1">
                            <button  type="button"
                                onClick={() => setActiveTab('details')}
                                className={`px-4 py-2 font-medium text-sm ${activeTab === 'details'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Room Details
                            </button>
                            <button  type="button"
                                onClick={() => setActiveTab('participants')}
                                className={`px-4 py-2 font-medium text-sm ${activeTab === 'participants'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Participants ({participants.length})
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {activeTab === 'details' ? (
                            <div className="space-y-6">
                                {/* Room Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Session Information</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Start Time:</span>
                                                    <span className="font-medium">{formatDateTime(room.beginTime)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">End Time:</span>
                                                    <span className="font-medium">{formatDateTime(room.endTime)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Duration:</span>
                                                    <span className="font-medium text-blue-600">
                                                        {formatDuration(room.duration)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-gray-700 mb-2">Statistics</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Total Participants:</span>
                                                    <span className="font-medium">{room.participants}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Avg Time per Participant:</span>
                                                    <span className="font-medium">
                                                        {formatDuration(stats.averageDuration)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-2">User Activity</h4>
                                        {loading ? (
                                            <div className="text-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                <p className="text-gray-500 mt-2">Loading activity data...</p>
                                            </div>
                                        ) : error ? (
                                            <div className="text-center py-8 text-red-600">
                                                <p>{error}</p>
                                            </div>
                                        ) : userInOutData.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                No activity data available
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-3 gap-4 mb-4">
                                                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-blue-600">
                                                            {stats.totalUsers}
                                                        </div>
                                                        <div className="text-xs text-gray-600">Total Users</div>
                                                    </div>
                                                    <div className="bg-green-50 p-3 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-green-600">
                                                            {stats.activeUsers}
                                                        </div>
                                                        <div className="text-xs text-gray-600">Currently Active</div>
                                                    </div>
                                                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                                                        <div className="text-lg font-bold text-purple-600">
                                                            {formatDuration(stats.totalDuration)}
                                                        </div>
                                                        <div className="text-xs text-gray-600">Total Time</div>
                                                    </div>
                                                </div>

                                                <div className="text-sm">
                                                    <div className="flex justify-between font-medium text-gray-700 mb-2">
                                                        <span>Recent Activity</span>
                                                        <span className="text-gray-500">Last 5 entries</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {userInOutData.slice(0, 5).map((user, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                                            >
                                                                <div>
                                                                    <div className="font-medium text-gray-800">
                                                                        {user.user_name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Joined: {new Date(user.time_in).toLocaleTimeString()}
                                                                        {user.time_out && ` • Left: ${new Date(user.time_out).toLocaleTimeString()}`}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-medium text-blue-600">
                                                                        {formatDuration(user.duration_minutes)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {user.time_out ? 'Completed' : 'In Progress'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* User In-Out Table */}
                                {userInOutData.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-gray-700 mb-3">Detailed User Timeline</h4>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-3 text-left text-gray-600">User</th>
                                                    <th className="p-3 text-left text-gray-600">Time In</th>
                                                    <th className="p-3 text-left text-gray-600">Time Out</th>
                                                    <th className="p-3 text-left text-gray-600">Duration</th>
                                                    <th className="p-3 text-left text-gray-600">Status</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                {userInOutData.map((user, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="font-medium">{user.user_name}</div>
                                                            <div className="text-xs text-gray-500">{user.user_uuid.substring(0, 8)}...</div>
                                                        </td>
                                                        <td className="p-3">
                                                            {new Date(user.time_in).toLocaleString('sv-SE', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            }).replace(' ', ' ')}
                                                        </td>
                                                        <td className="p-3">
                                                            {user.time_out ? new Date(user.time_out).toLocaleString('sv-SE', {
                                                                year: 'numeric',
                                                                month: '2-digit',
                                                                day: '2-digit',
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                second: '2-digit'
                                                            }).replace(' ', ' ') : '-'}
                                                        </td>
                                                        <td className="p-3">
                                                                <span className="font-medium text-blue-600">
                                                                    {formatDuration(user.duration_minutes)}
                                                                </span>
                                                        </td>
                                                        <td className="p-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs ${user.time_out
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-blue-100 text-blue-800'
                                                                }`}>
                                                                    {user.time_out ? 'Completed' : 'Active'}
                                                                </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <h4 className="font-semibold text-gray-700 mb-4">Room Participants</h4>
                                {participants.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No participants data available
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <div className="text-xl font-bold text-blue-600">
                                                    {participants.length}
                                                </div>
                                                <div className="text-sm text-gray-600">Total Participants</div>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <div className="text-xl font-bold text-green-600">
                                                    {participants.filter(p => p.is_delete === 0).length}
                                                </div>
                                                <div className="text-sm text-gray-600">Active</div>
                                            </div>
                                            <div className="bg-purple-50 p-4 rounded-lg">
                                                <div className="text-xl font-bold text-purple-600">
                                                    {Math.round(room.duration / participants.length)}m
                                                </div>
                                                <div className="text-sm text-gray-600">Avg Time</div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="p-3 text-left text-gray-600">User</th>
                                                    <th className="p-3 text-left text-gray-600">Role</th>
                                                </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                {participants.map((participant, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="font-medium">
                                                                {participant.user_name || 'Unknown'}
                                                            </div>
                                                        </td>
                                                        <td className="p-3">
                                                                <span className={`px-2 py-1 rounded-full text-xs ${participant.rtc_uid === 1
                                                                    ? 'bg-purple-100 text-purple-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {participant.rtc_uid === 1 ? 'Host' : 'Participant'}
                                                                </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t flex justify-end items-center">
                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

type TimeRange = 'all' | 'month'

export const CustomerAnalytics: React.FC = () => {
    const emailField = useFormFields(([fields]) => fields.email)
    const customerEmail = emailField?.value as string
    const [userName, setUserName] = useState<string>('')

    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const [rooms, setRooms] = useState<RoomItem[]>([])
    const [roomsWithDetails, setRoomsWithDetails] = useState<RoomWithDetails[]>([])
    const [adminToken, setAdminToken] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [detailsError, setDetailsError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (customerEmail) {
            const nameFromEmail = customerEmail.split('@')[0];
            setUserName(nameFromEmail);
        }
    }, [customerEmail])
    useEffect(() => {
        if (isOpen) {
            fetchAnalyticsData()
        }
    }, [isOpen])

    useEffect(() => {
        if (rooms.length > 0 && adminToken) {
            fetchRoomDetails()
        }
    }, [rooms, adminToken])

    const calculateDuration = (beginTime: string, endTime: string): number => {
        try {
            const begin = new Date(beginTime).getTime()
            const end = new Date(endTime).getTime()
            if (isNaN(begin) || isNaN(end)) return 0

            const diffMs = end - begin
            return Math.max(0, Math.floor(diffMs / (1000 * 60))) // convert to minutes
        } catch {
            return 0
        }
    }

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true)
            setError(null)

            const result = await getAdminRoomsAction(userName)
            console.log('API Response for user:', userName, result)

            if (result.success) {
                // Lấy data từ response API
                const roomsData = result.data?.list || []
                console.log(`Filtered rooms for ${userName}:`, roomsData)


                const roomItems: RoomItem[] = roomsData.map((room: any) => {
                    const duration = calculateDuration(room.begin_time, room.end_time)
                    return {
                        roomUUID: room.room_uuid,
                        title: room.title || 'Untitled Room',
                        beginTime: room.begin_time,
                        endTime: room.end_time,
                        roomStatus: room.room_status || 'Unknown',
                        duration: duration
                    }
                })

                console.log('Processed rooms:', roomItems)
                setRooms(roomItems)
                setAdminToken(result.token || '')
                setLastUpdated(new Date())
            } else {
                setError("Failed to load rooms: " + (result.error || 'Unknown error'))
            }
        } catch (e: any) {
            console.error('Error fetching analytics:', e)
            setError("Error server: " + e.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchRoomDetails = async () => {
        if (!rooms.length || !adminToken) return

        try {
            setDetailsLoading(true)
            setDetailsError(null)

            const stoppedRooms = rooms.filter(room =>
                room.roomStatus === 'Stopped' || room.roomStatus === 'stopped'
            )

            const roomsDetails: RoomWithDetails[] = []

            for (const room of stoppedRooms.slice(0, 20)) {
                try {
                    const result = await getRoomDetailAction(room.roomUUID, adminToken)
                    console.log('Room detail result:', room.roomUUID, result)

                    if (result.success) {
                        const participants = result.data?.participants?.participants || []
                        const roomDetail: RoomWithDetails = {
                            roomUUID: room.roomUUID,
                            title: room.title,
                            beginTime: room.beginTime,
                            endTime: room.endTime,
                            roomStatus: room.roomStatus,
                            duration: room.duration,
                            participants: participants.length,
                            participantsData: participants
                        }
                        roomsDetails.push(roomDetail)
                    } else {
                        // Fallback nếu không lấy được chi tiết
                        const roomDetail: RoomWithDetails = {
                            roomUUID: room.roomUUID,
                            title: room.title,
                            beginTime: room.beginTime,
                            endTime: room.endTime,
                            roomStatus: room.roomStatus,
                            duration: room.duration,
                            participants: 1 // default
                        }
                        roomsDetails.push(roomDetail)
                    }
                } catch (roomError) {
                    console.error(`Error fetching details for room ${room.roomUUID}:`, roomError)

                    const roomDetail: RoomWithDetails = {
                        roomUUID: room.roomUUID,
                        title: room.title,
                        beginTime: room.beginTime,
                        endTime: room.endTime,
                        roomStatus: room.roomStatus,
                        duration: room.duration,
                        participants: 1
                    }
                    roomsDetails.push(roomDetail)
                }

                // Thêm delay nhỏ để tránh rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            setRoomsWithDetails(roomsDetails)
        } catch (err: any) {
            console.error('Error fetching room details:', err)
            setDetailsError('Failed to load room details: ' + err.message)
        } finally {
            setDetailsLoading(false)
        }
    }

    const formatTime = (totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    }

    const getStoppedRoomsCount = (): number => {
        return roomsWithDetails.length
    }

    const getTotalParticipants = (): number => {
        return roomsWithDetails.reduce((sum, room) => sum + room.participants, 0)
    }

    const getTotalDuration = (): number => {
        return roomsWithDetails.reduce((sum, room) => sum + room.duration, 0)
    }

    const handleRoomClick = (room: RoomWithDetails) => {
        setSelectedRoom(room)
        setShowModal(true)
    }

    const handleOpen = () => {
        setIsOpen(true)
    }

    const handleRefresh = () => {
        fetchAnalyticsData()
    }

    // Sửa phần render loading
    if (loading && isOpen) {
        return (
            <div className="customer-analytics-field">
                <label className="field-label" style={{ marginBottom: '10px', display: 'block' }}>
                    Flat Analytics
                </label>
                <div style={{ marginBottom: '20px' }}>
                    <Button onClick={handleOpen} buttonStyle="secondary">
                        📊 View Analytics
                    </Button>
                </div>

                {isOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 9999,
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}>
                        <div style={{
                            width: '1000px',
                            maxWidth: '90%',
                            height: '100%',
                            backgroundColor: 'var(--theme-elevation-0)',
                            padding: '24px',
                            overflowY: 'auto',
                            boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                            color: 'var(--theme-text)'
                        }}>
                            <div className="flex justify-center items-center h-full">
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Loading analytics data...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="customer-analytics-field">
            <label className="field-label" style={{ marginBottom: '10px', display: 'block' }}>
                Flat Analytics
            </label>
            <div style={{ marginBottom: '20px' }}>
                <Button onClick={handleOpen} buttonStyle="secondary">
                    📊 View Analytics
                </Button>
            </div>

            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <div style={{
                        width: '1000px',
                        maxWidth: '90%',
                        height: '100%',
                        backgroundColor: 'var(--theme-elevation-0)',
                        padding: '0',
                        overflowY: 'auto',
                        boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                        color: 'var(--theme-text)'
                    }}>
                        {/* Analytics Dashboard Content */}
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold">Overview</h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-500 hover:text-gray-700 p-2"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Customer Info Banner */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm text-blue-800">
                                            <strong>Customer:</strong> {customerEmail || 'Unknown'}
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Showing analytics for all rooms accessible by admin
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Note Banner */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <p className="text-sm text-blue-800">
                                            <strong>Note:</strong> Only showing rooms with status "Stopped" (completed sessions)
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            This ensures accurate analytics data based on actual session duration and participant activity.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Error Banners */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm text-red-800">{error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {detailsError && !error && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className="text-sm text-yellow-800">{detailsError}</p>
                                            <p className="text-xs text-yellow-600 mt-1">
                                                Showing estimated data based on available room information.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stats Grid */}


                            {/* Detailed Statistics */}
                            <div className="bg-[#fcfcfa] border rounded-lg p-6 shadow-sm mb-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold">Completed Sessions Analytics</h3>
                                    {lastUpdated && (
                                        <span className="text-xs text-gray-500">
                                            Last updated: {lastUpdated.toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>

                                {roomsWithDetails.length > 0 ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                            <div className="p-4 bg-blue-50 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {getStoppedRoomsCount()}
                                                </div>
                                                <div className="text-sm text-gray-600">Completed Rooms</div>
                                            </div>
                                            <div className="p-4 bg-purple-50 rounded-lg">
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {getTotalParticipants()}
                                                </div>
                                                <div className="text-sm text-gray-600">Total Participants</div>
                                            </div>
                                            <div className="p-4 bg-green-50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {formatTime(getTotalDuration())}
                                                </div>
                                                <div className="text-sm text-gray-600">Total Session Time</div>
                                            </div>
                                            <div className="p-4 bg-orange-50 rounded-lg">
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {getStoppedRoomsCount() > 0 ? Math.round(getTotalDuration() / getStoppedRoomsCount()) : 0}m
                                                </div>
                                                <div className="text-sm text-gray-600">Avg Session Duration</div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-medium">Recent Completed Sessions</h4>
                                                <span className="text-xs text-gray-500">
                                                    {getTotalParticipants()} total participants • Click any session for details
                                                </span>
                                            </div>
                                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                                {roomsWithDetails.slice(0, 20).map((room) => (
                                                    <div
                                                        key={room.roomUUID}
                                                        onClick={() => handleRoomClick(room)}
                                                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group border"
                                                    >
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm flex items-center gap-2">
                                                                {room.title}
                                                                <span className="hidden group-hover:inline text-xs text-blue-600">
                                                                    Click to view details →
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {new Date(room.beginTime).toLocaleDateString()} • {room.roomStatus}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold text-orange-600">
                                                                {formatTime(room.duration)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {room.participants} participants
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <div className="text-4xl mb-4">📊</div>
                                        <p className="text-lg mb-2">No completed sessions found</p>
                                        <p className="text-sm">
                                            {error
                                                ? 'Unable to load data from the server.'
                                                : 'No rooms with "Stopped" status found.'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-between items-center">
                                <div className="text-sm text-gray-500">
                                    {error && 'Using fallback data - some statistics may be incomplete'}
                                    {detailsError && !error && 'Using estimated room details and participants data'}
                                    {!error && !detailsError && `Showing ${getStoppedRoomsCount()} completed sessions`}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={fetchRoomDetails}
                                        disabled={detailsLoading || !rooms.length}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <span>{detailsLoading ? 'Refreshing Details...' : 'Refresh Details'}</span>
                                        <svg
                                            className={`w-4 h-4 ${detailsLoading ? 'animate-spin' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        <span>{loading ? 'Refreshing...' : 'Refresh All Data'}</span>
                                        <svg
                                            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Room Detail Modal */}
            {showModal && selectedRoom && adminToken && (
                <RoomDetailModal
                    room={selectedRoom}
                    onClose={() => {
                        setShowModal(false)
                        setSelectedRoom(null)
                    }}
                    token={adminToken}
                />
            )}
        </div>
    )
}

export default CustomerAnalytics
