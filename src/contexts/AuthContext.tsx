'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FlatUser } from '@/services/flat/types';

interface AuthContextType {
    user: FlatUser | null;
    customerId: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, code: string) => Promise<void>;
    sendVerificationCode: (email: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    error: string | null;
    isCheckingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<FlatUser | null>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Load user and customerId from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('flatUser');
        const savedCustomerId = localStorage.getItem('customerId');

        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);

                // Try to get customerId from user data or localStorage
                if (parsedUser.customerId) {
                    setCustomerId(parsedUser.customerId);
                } else if (savedCustomerId) {
                    setCustomerId(savedCustomerId);
                } else {
                    // If no customerId found, fetch it from API
                    fetchCustomerId(parsedUser.email);
                }

                console.log('Loaded user from localStorage:', parsedUser);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('flatUser');
                localStorage.removeItem('customerId');
            }
        }
        setIsCheckingAuth(false);
    }, []);

    const fetchCustomerId = async (email: string) => {
        try {
            const response = await fetch('/api/customers/find-by-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.customerId) {
                    setCustomerId(data.customerId);
                    localStorage.setItem('customerId', data.customerId);
                }
            }
        } catch (error) {
            console.error('Error fetching customer ID:', error);
        }
    };

    const sendVerificationCode = async (email: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/register/send-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send verification code');
            }

            console.log('Verification code sent successfully');

        } catch (error: any) {
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (email: string, password: string, code: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, code }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            const userData = data.data;
            setUser(userData);
            localStorage.setItem('flatUser', JSON.stringify(userData));

            // Fetch customer ID after registration
            await fetchCustomerId(email);

            console.log('Registration successful, user saved to localStorage');

        } catch (error: any) {
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            const userData = data.data;
            setUser(userData);
            localStorage.setItem('flatUser', JSON.stringify(userData));

            // Fetch customer ID after login
            await fetchCustomerId(email);

            console.log('Login successful, user saved to localStorage');

        } catch (error: any) {
            setError(error.message);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setCustomerId(null);
        localStorage.removeItem('flatUser');
        localStorage.removeItem('customerId');
        console.log('User logged out');
    };

    const value = {
        user,
        customerId,
        login,
        register,
        sendVerificationCode,
        logout,
        isLoading,
        error,
        isCheckingAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
