'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from 'next/navigation';


import { Background } from "@/components/background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, login } = useAuth();
  const router = useRouter();

  // Kiểm tra nếu đã đăng nhập thì chuyển hướng đến dashboard
  useEffect(() => {
    if (user?.token) {
      console.log('User already logged in, redirecting to dashboard...');
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Kiểm tra lại trước khi submit (phòng trường hợp useEffect chưa kịp chạy)
    if (user?.token) {
      router.push('/dashboard');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      // Sau khi login thành công, AuthContext sẽ cập nhật user
      // useEffect sẽ tự động chuyển hướng
      console.log('Login successful, waiting for redirect...');

    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Implement Google login logic here
    console.log('Google login clicked');
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
                  <p className="text-muted-foreground mt-2">You logged in, please wait to redirect dashboard</p>
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
                  <p className="mb-2 text-2xl font-bold">Welcome back</p>
                  <p className="text-muted-foreground">
                    Please enter your details.
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4">
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
                      </div>

                      {error && (
                          <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                            {error}
                          </div>
                      )}

                      <div className="flex justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                              id="remember"
                              className="border-muted-foreground"
                              checked={rememberMe}
                              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                              disabled={isLoading}
                          />
                          <label
                              htmlFor="remember"
                              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Remember me
                          </label>
                        </div>
                        <a href="#" className="text-primary text-sm font-medium">
                          Forgot password
                        </a>
                      </div>
                      <Button
                          type="submit"
                          className="mt-2 w-full"
                          disabled={isLoading}
                      >
                        {isLoading ? 'Signing in...' : 'Sign in'}
                      </Button>
                    </div>
                  </form>
                  <div className="text-muted-foreground mx-auto mt-8 flex justify-center gap-1 text-sm">
                    <p>Don&apos;t have an account?</p>
                    <Link href="/signup" className="text-primary font-medium">
                      Sign up
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </Background>
  );
};

export default Login;
