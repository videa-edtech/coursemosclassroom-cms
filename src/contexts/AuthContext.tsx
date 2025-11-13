// src/contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FlatUser } from '@/services/flatService';

interface AuthContextType {
    user: FlatUser | null;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem('flatUser');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                console.log('Loaded user from localStorage:', parsedUser);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('flatUser');
            }
        }
        setIsCheckingAuth(false);
    }, []);

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
        localStorage.removeItem('flatUser');
        console.log('User logged out');
    };

    const value = {
        user,
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
