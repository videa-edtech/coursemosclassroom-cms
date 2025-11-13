// src/app/(frontend)/signup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';

import { FcGoogle } from "react-icons/fc";

import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';

const Signup = () => {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const { user, register, sendVerificationCode } = useAuth();
  const router = useRouter();

  // Kiểm tra nếu đã đăng nhập thì chuyển hướng đến dashboard
  useEffect(() => {
    if (user?.token) {
      console.log('User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError('Please fill all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendVerificationCode(email);
      setStep(2);
      setCountdown(60); // 60 seconds countdown
    } catch (error: any) {
      setError(error.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code) {
      setError('Please enter verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(email, password, code);
      // Sau khi đăng ký thành công, AuthContext sẽ cập nhật user
      // useEffect sẽ tự động chuyển hướng
      console.log('Registration successful, waiting for redirect...');
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      await sendVerificationCode(email);
      setCountdown(60);
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setError('');
    setCode('');
  };

  const handleGoogleSignup = () => {
    // Implement Google signup logic here
    console.log('Google signup clicked');
  };

  // Hiển thị loading nếu đang kiểm tra trạng thái đăng nhập
  if (user?.token) {
    return (
        <Background>
          <section className="py-28 lg:pt-44 lg:pb-32">
            <div className="container">
              <div className="flex flex-col items-center justify-center">
                <div className="text-center">
                  <p className="text-xl font-semibold">Redirecting...</p>
                  <p className="text-muted-foreground mt-2">You are already logged in, redirecting to dashboard</p>
                </div>
              </div>
            </div>
          </section>
        </Background>
    );
  }

  return (
      <Background>
        <section className="py-28 lg:pt-44 lg:pb-32">
          <div className="container">
            <div className="flex flex-col gap-4">
              <Card className="mx-auto w-full max-w-sm">
                <CardHeader className="flex flex-col items-center space-y-0">
                  <Image
                      src="/logo.svg"
                      alt="logo"
                      width={94}
                      height={18}
                      className="mb-7 dark:invert"
                  />
                  <p className="mb-2 text-2xl font-bold">
                    {step === 1 ? 'Start your free trial' : 'Verify your email'}
                  </p>
                  <p className="text-muted-foreground text-center">
                    {step === 1
                        ? 'Sign up in less than 2 minutes.'
                        : `We sent a verification code to ${email}`
                    }
                  </p>
                </CardHeader>
                <CardContent>
                  {step === 1 ? (
                      <form onSubmit={handleStep1}>
                        <div className="grid gap-4">
                          <Input
                              type="text"
                              placeholder="Enter your name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required
                              disabled={isLoading}
                          />
                          <Input
                              type="email"
                              placeholder="Enter your email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              disabled={isLoading}
                          />
                          <div>
                            <Input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <p className="text-muted-foreground mt-1 text-sm">
                              Must be at least 8 characters.
                            </p>
                          </div>

                          {error && (
                              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                              </div>
                          )}

                          <Button
                              type="submit"
                              className="mt-2 w-full"
                              disabled={isLoading}
                          >
                            {isLoading ? 'Sending code...' : 'Continue'}
                          </Button>


                        </div>
                      </form>
                  ) : (
                      <form onSubmit={handleStep2}>
                        <div className="grid gap-4">
                          <div className="text-center mb-4">
                            <p className="text-sm text-muted-foreground">
                              We sent a 6-digit code to <strong>{email}</strong>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Enter the code below to verify your email address
                            </p>
                          </div>

                          <Input
                              type="text"
                              placeholder="Enter verification code"
                              value={code}
                              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              required
                              disabled={isLoading}
                              maxLength={6}
                              className="text-center text-lg font-semibold tracking-widest"
                          />

                          {error && (
                              <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                                {error}
                              </div>
                          )}

                          <div className="flex justify-between items-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleResendCode}
                                disabled={isLoading || countdown > 0}
                            >
                              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleBackToStep1}
                                disabled={isLoading}
                            >
                              Change email
                            </Button>
                          </div>

                          <Button
                              type="submit"
                              className="w-full"
                              disabled={isLoading}
                          >
                            {isLoading ? 'Creating account...' : 'Create account'}
                          </Button>
                        </div>
                      </form>
                  )}

                  <div className="text-muted-foreground mx-auto mt-8 flex justify-center gap-1 text-sm">
                    <p>Already have an account?</p>
                    <Link href="/login" className="text-primary font-medium">
                      Log in
                    </Link>
                  </div>

                  {/* Step indicator */}
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      <div className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-primary' : 'bg-muted'}`}></div>
                      <div className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-primary' : 'bg-muted'}`}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Background>
  );
};

export default Signup;
