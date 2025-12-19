// src/app/(frontend)/signup/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';

// API service function to check if email exists
const checkEmailExists = async (email: string): Promise<{
  exists: boolean;
  message?: string;
  status?: number;
  data?: any;
}> => {
  try {
    const response = await fetch(`/api/auth/register/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
};

const Signup = () => {
  const [step, setStep] = useState(1); // 1: Basic info, 2: Verification
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [passwordError, setPasswordError] = useState('');

  // State cho show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Validate password strength
  const validatePassword = (password: string): string => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }

    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }

    return '';
  };

  // Check if passwords match
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  }, [password, confirmPassword]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setPasswordError('');

    // Validate required fields
    if (!email || !password || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Kiểm tra email tồn tại trước khi gửi code
    setIsLoading(true);

    try {
      const result = await checkEmailExists(email);
      const emailExists = result.data?.exists || result.exists || false;

      if (emailExists) {
        setError('This email is already registered. Please use a different email or try logging in.');
        setIsLoading(false);
        return;
      }
    } catch (error: any) {
      console.error('Failed to check email:', error);
      // Nếu check fails, vẫn cho phép tiếp tục để không block user
      // Bạn có thể bỏ comment dòng dưới nếu muốn block khi check fails
      // setError('Cannot verify email availability. Please try again later.');
      // setIsLoading(false);
      // return;
    }

    // Validate password strength
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setError(passwordValidationError);
      setIsLoading(false);
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // CHỈ GỬI CODE KHI EMAIL CHƯA TỒN TẠI
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

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(code)) {
      setError('Please enter a valid 6-digit code');
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
      if (error.message?.includes('already registered') || error.message?.includes('exists')) {
        setError('This email is already registered. Please try logging in instead.');
      } else {
        setError(error.message || 'Registration failed. Please try again.');
      }
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

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/(?=.*[a-z])/.test(password)) strength += 25;
    if (/(?=.*[A-Z])/.test(password)) strength += 25;
    if (/(?=.*\d)/.test(password)) strength += 15;
    if (/(?=.*[@$!%*?&])/.test(password)) strength += 10;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const getStrengthColor = (strength: number) => {
    if (strength < 50) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  const getStrengthText = (strength: number) => {
    if (strength < 50) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  // Helper functions to check password requirements
  const hasLowercase = (pwd: string) => /(?=.*[a-z])/.test(pwd);
  const hasUppercase = (pwd: string) => /(?=.*[A-Z])/.test(pwd);
  const hasNumber = (pwd: string) => /(?=.*\d)/.test(pwd);
  const hasSpecialChar = (pwd: string) => /(?=.*[@$!%*?&])/.test(pwd);

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
                  {/*<p className="text-muted-foreground text-center">*/}
                  {/*  {step === 1*/}
                  {/*      ? 'Sign up in less than 2 minutes.'*/}
                  {/*      : `We sent a verification code to ${email}`*/}
                  {/*  }*/}
                  {/*</p>*/}
                </CardHeader>
                <CardContent>
                  {step === 1 ? (
                      <form onSubmit={handleStep1}>
                        <div className="grid gap-4">
                          <div>
                            <Input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.trim())}
                                required
                                disabled={isLoading}
                            />
                          </div>

                          <div className="relative flex items-center">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                className="absolute right-1.5 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                            >
                              {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                              ) : (
                                  <Eye className="h-4 w-4" />
                              )}
                            </button>


                          </div>

                          <div className="relative flex items-center">
                            <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className={`pr-10 ${passwordError ? 'border-red-500' : ''} ${!passwordError && password ? 'border-green-600' : ''}`}
                            />
                            <button
                                type="button"
                                className="absolute right-1.5 text-gray-500 hover:text-gray-700"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                            >
                              {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                              ) : (
                                  <Eye className="h-4 w-4" />
                              )}
                            </button>

                          </div>
                          {confirmPassword && passwordError && (
                              <p className="text-xs text-red-500">{passwordError}</p>
                          )}
                          {/*{confirmPassword && !passwordError && password === confirmPassword && (*/}
                          {/*    <p className="text-sm text-green-600 mt-1">✓ Passwords match</p>*/}
                          {/*)}*/}
                          {/* Password strength indicator */}
                          {password && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Password strength:</span>
                                  <span className={passwordStrength >= 80 ? 'text-green-600 font-medium' : passwordStrength >= 50 ? 'text-yellow-600 font-medium' : 'text-red-600 font-medium'}>
                                      {getStrengthText(passwordStrength)}
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                      className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                                      style={{ width: `${passwordStrength}%` }}
                                  />
                                </div>
                                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                                  <li className={password.length >= 8 ? 'text-green-600' : ''}>
                                    • At least 8 characters {password.length >= 8 && '✓'}
                                  </li>
                                  <li className={hasLowercase(password) ? 'text-green-600' : ''}>
                                    • One lowercase letter {hasLowercase(password) && '✓'}
                                  </li>
                                  <li className={hasUppercase(password) ? 'text-green-600' : ''}>
                                    • One uppercase letter {hasUppercase(password) && '✓'}
                                  </li>
                                  <li className={hasNumber(password) ? 'text-green-600' : ''}>
                                    • One number {hasNumber(password) && '✓'}
                                  </li>
                                  <li className={hasSpecialChar(password) ? 'text-green-600' : ''}>
                                    • One special character (@$!%*?&) {hasSpecialChar(password) && '✓'}
                                  </li>
                                </ul>
                              </div>
                          )}
                          {error && (
                              <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                {error}

                              </div>
                          )}

                          <Button
                              type="submit"
                              className="mt-2 w-full"
                              disabled={isLoading || !!passwordError}
                          >
                            {isLoading ? 'Checking and sending code...' : 'Continue'}
                          </Button>

                          <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary font-medium">
                              Log in
                            </Link>
                          </div>
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
                              <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">
                                {error}
                                {error.includes('already registered') && (
                                    <div className="mt-2">
                                      <Link href="/login" className="text-primary font-medium underline">
                                        Click here to login instead
                                      </Link>
                                    </div>
                                )}
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
                              disabled={isLoading || code.length !== 6}
                          >
                            {isLoading ? 'Creating account...' : 'Create account'}
                          </Button>

                          <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary font-medium">
                              Log in
                            </Link>
                          </div>
                        </div>
                      </form>
                  )}

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
