import React, { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { useAuthStore } from '../stores';
import { AuthService, ApiException, ErrorUtils } from '../services';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onSwitchToSignup: () => void;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export function LoginScreen({ onLoginSuccess, onSwitchToSignup }: LoginScreenProps) {
  const { login, isLoading: authLoading, error: authError, clearError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'email':
        if (!value) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email';
        return undefined;
      case 'password':
        if (!value) return 'Password is required';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const value = field === 'email' ? email : password;
    const error = validateField(field, value);
    setErrors({ ...errors, [field]: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous auth errors
    clearError();

    const emailError = validateField('email', email);
    const passwordError = validateField('password', password);

    setErrors({
      email: emailError,
      password: passwordError,
    });

    setTouched({
      email: true,
      password: true,
    });

    if (emailError || passwordError) {
      return;
    }

    try {
      // Use auth store for login
      await login({
        email,
        password,
        remember_me: rememberMe,
      });

      // Only execute success logic if login was successful
      toast.success('Welcome back to ChatPdf!', {
        duration: 3000,
      });

      // Call success handler immediately - no delay needed
      onLoginSuccess();

    } catch (error) {
      // Login failed - get the actual server error message for toast
      const serverErrorMessage = ErrorUtils.getErrorMessage(error);
      
      // Show server error in toast
      toast.error(serverErrorMessage);
      
      // Don't set local form errors - use authError from store instead
      // The auth store will have the error, and we'll display a user-friendly message
    }
  };

  const handleSocialLogin = async (provider: string) => {
    try {
      const authUrl = await AuthService.getOAuthUrl(provider as 'google' | 'github');
      window.location.href = authUrl;
    } catch (error) {
      toast.error(`${provider} authentication is not configured`);
    }
  };

  const handleForgotPassword = () => {
    toast.info('Password reset link would be sent to your email', {
      duration: 2000,
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white opacity-5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h1 className="text-white" style={{ fontSize: '2rem' }}>ChatPdf</h1>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="mb-4 text-white">Welcome back!</h2>
              <p className="text-lg text-white opacity-90 leading-relaxed">
                Sign in to continue chatting with your documents and accessing your ChatPdf-powered insights.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white mb-1">Lightning Fast</h3>
                  <p className="text-white opacity-80 text-sm">
                    Get instant answers from your documents with our advanced AI
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white mb-1">Collaborative</h3>
                  <p className="text-white opacity-80 text-sm">
                    Share insights and collaborate with your team seamlessly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white mb-1">Powerful Analytics</h3>
                  <p className="text-white opacity-80 text-sm">
                    Track and analyze document interactions with detailed insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl mb-1">50K+</p>
              <p className="text-sm opacity-80">Documents Analyzed</p>
            </div>
            <div>
              <p className="text-3xl mb-1">10K+</p>
              <p className="text-sm opacity-80">Active Users</p>
            </div>
            <div>
              <p className="text-3xl mb-1">99.9%</p>
              <p className="text-sm opacity-80">Accuracy Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 relative overflow-hidden">
        {/* Background gradient circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 opacity-20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 opacity-20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="mb-2 text-gray-900">Sign in to ChatPdf</h2>
              <p className="text-gray-600">Welcome back! Please enter your details</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`transition-all ${
                    touched.email && errors.email
                      ? 'border-red-500 ring-2 ring-red-200'
                      : 'focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                  }`}
                />
                {touched.email && errors.email && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-3 w-3" />
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear both local password error and auth error when user types
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: undefined }));
                      }
                      if (authError) {
                        clearError();
                      }
                    }}
                    onBlur={() => handleBlur('password')}
                    className={`pr-10 transition-all ${
                      (touched.password && errors.password) || authError
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {(touched.password && errors.password) || authError ? (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-3 w-3" />
                    <span>
                      {authError ? 'Invalid email or password. Please try again.' : errors.password}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-gray-700 cursor-pointer select-none"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('Google')}
                className="transition-all hover:bg-gray-50"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSocialLogin('GitHub')}
                className="transition-all hover:bg-gray-50"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
            </div>

            <p className="text-center text-sm text-gray-600 mt-6">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Sign up for ChatPdf
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Protected by reCAPTCHA and subject to the Privacy Policy and Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
