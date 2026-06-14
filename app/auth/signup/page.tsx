'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import GoogleSignInButton from '@/components/google-signin-button';
import Image from 'next/image';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  const getPasswordStrength = (password: string) => {
    if (!password) return '';

    const checks = [
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
      password.length >= 8,
    ];

    const score = checks.filter(Boolean).length;

    if (score <= 2) return 'Weak';
    if (score <= 4) return 'Medium';
    return 'Strong';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await signup(name, email, password);
      console.log('Signup success status: ', success);

      if (success) {
        toast({
          title: 'Welcome to EcoVerse!',
          description: 'Your account has been created successfully.',
        });
        router.push('/avatar-selection');
      } else {
        toast({
          title: 'Sign up failed',
          description: 'Please check your information and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[450px] bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-800 shadow-xl rounded-2xl overflow-hidden p-8 sm:p-10 my-8">
        <div className="flex flex-col items-center justify-center space-y-3 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <Image
              src="/logo.png"
              alt="EcoVerse logo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              EcoVerse
            </span>
          </Link>
        </div>

        <div className="flex flex-col space-y-2 text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Create Your Account
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Join the EcoVerse community
          </p>
        </div>

        <GoogleSignInButton
          text="Sign up with Google"
          className="mb-6"
          redirectUrl="/avatar-selection"
        />

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-[#111111] px-3 text-gray-500 dark:text-gray-400 font-medium">
              Or continue with email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-green-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-green-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-green-500 transition-colors pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <p className="text-xs mt-1.5 font-medium">
                Password Strength:{' '}
                <span
                  className={
                    getPasswordStrength(password) === 'Strong'
                      ? 'text-green-600 dark:text-green-500'
                      : getPasswordStrength(password) === 'Medium'
                        ? 'text-yellow-600 dark:text-yellow-500'
                        : 'text-red-600 dark:text-red-500'
                  }
                >
                  {getPasswordStrength(password)}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-11 bg-transparent border-gray-300 dark:border-gray-700 focus-visible:ring-1 focus-visible:ring-green-500 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors mt-2"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
          </span>
          <Link
            href="/auth/signin"
            className="text-green-600 dark:text-green-500 hover:underline font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:underline transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
