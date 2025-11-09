import { useState } from 'react';
import { Eye, EyeOff, X, Check, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';

interface PasswordResetScreenProps {
  onResetComplete: () => void;
  userEmail: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

export function PasswordResetScreen({ onResetComplete, userEmail }: PasswordResetScreenProps) {
  const [step, setStep] = useState<'confirm' | 'reset'>('confirm');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 20;
    return Math.min(strength, 100);
  };

  const passwordStrength = calculatePasswordStrength(password);

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return undefined;
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== password) return 'Passwords do not match';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const value = field === 'password' ? password : confirmPassword;
    const error = validateField(field, value);
    setErrors({ ...errors, [field]: error });
  };

  const handleSendResetLink = () => {
    setIsLoading(true);
    // Simulate sending reset link
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password reset link sent to your email!');
      setTimeout(() => {
        setStep('reset');
      }, 1000);
    }, 1500);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validateField('password', password);
    const confirmPasswordError = validateField('confirmPassword', confirmPassword);

    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    setTouched({
      password: true,
      confirmPassword: true,
    });

    if (passwordError || confirmPasswordError) {
      return;
    }

    setIsLoading(true);

    // Simulate password reset
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Password reset successful! Logging you in...');
      setTimeout(() => {
        onResetComplete();
      }, 1500);
    }, 1500);
  };

  if (step === 'confirm') {
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
                <h1 className="text-white">DocChat AI</h1>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="mb-4 text-white">Secure your account</h2>
                <p className="text-lg text-white opacity-90 leading-relaxed">
                  We take security seriously. Follow the steps to reset your password and regain access to your account.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Email Verification</h3>
                    <p className="text-white opacity-80 text-sm">
                      Check your inbox for the password reset link
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Create New Password</h3>
                    <p className="text-white opacity-80 text-sm">
                      Choose a strong, unique password for your account
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white mb-1">Account Secured</h3>
                    <p className="text-white opacity-80 text-sm">
                      Log back in with your new credentials
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-8 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>Secure Process</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>Email Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>Protected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Confirmation */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 relative overflow-hidden">
          {/* Background gradient circles */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 opacity-20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 opacity-20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="mb-8 text-center">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="mb-2 text-gray-900">Reset Your Password</h2>
                <p className="text-gray-600">We'll send a reset link to your email</p>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-2">Reset link will be sent to:</p>
                  <p className="text-blue-600">{userEmail}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-900">
                    ⚠️ You will be logged out of all devices for security purposes.
                  </p>
                </div>

                <Button
                  onClick={handleSendResetLink}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  Didn't request a password reset?{' '}
                  <button className="text-blue-600 hover:underline">
                    Cancel
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white opacity-5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white w-full">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h1 className="text-white">DocChat AI</h1>
            </div>

            <div>
              <h2 className="mb-4 text-white">Almost there!</h2>
              <p className="text-lg text-white opacity-90 leading-relaxed">
                Create a strong password to secure your account and protect your documents.
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <h4 className="text-white mb-3">Password Requirements:</h4>
              <ul className="space-y-2 text-white opacity-90 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  At least 8 characters long
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Mix of uppercase and lowercase
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Include numbers and symbols
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Reset Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 opacity-20 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 opacity-20 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="mb-2 text-gray-900">Create New Password</h2>
              <p className="text-gray-600">Enter your new password below</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur('password')}
                    className={`pr-10 transition-all ${
                      touched.password && errors.password
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-3 w-3" />
                    <span>{errors.password}</span>
                  </div>
                )}
                {password && !errors.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Password strength:</span>
                      <span
                        className={`${
                          passwordStrength < 40
                            ? 'text-red-600'
                            : passwordStrength < 70
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <Progress
                      value={passwordStrength}
                      className="h-1.5"
                      indicatorClassName={getPasswordStrengthColor()}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
                    className={`pr-10 transition-all ${
                      touched.confirmPassword && errors.confirmPassword
                        ? 'border-red-500 ring-2 ring-red-200'
                        : 'focus:ring-2 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <X className="h-3 w-3" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all"
                disabled={isLoading}
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
