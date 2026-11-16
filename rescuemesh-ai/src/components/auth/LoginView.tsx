import React, { useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail } from 'lucide-react';
import { useEmergency } from '../../context/EmergencyContext';
import { RescueMeshLogo } from '../common/RescueMeshLogo';
import { BrandPanel } from './BrandPanel';
import { LoginBackdrop } from './LoginBackdrop';
import { LoginField } from './LoginField';
import { EASE_OUT } from './loginMotion';

interface LoginViewProps {
  onLoginSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { login, apiError } = useEmergency();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (validationErrors.email) {
      setValidationErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (authError) setAuthError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (validationErrors.password) {
      setValidationErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (authError) setAuthError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password,
      });
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.toLowerCase().includes('credential') || msg.includes('401')) {
        setAuthError('Email or password is incorrect.');
      } else {
        setAuthError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = authError || apiError;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative isolate flex min-h-dvh flex-col justify-between overflow-x-hidden bg-[#07111F] text-slate-100">
        <LoginBackdrop />

        {/* Main Content Area */}
        <main className="relative flex flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto grid w-full max-w-[1240px] items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
            {/* Left Column: Brand Hero & 3 Capabilities (Hidden on small mobile screens to keep layout focused) */}
            <BrandPanel className="hidden lg:block lg:max-w-none" />

            {/* Right Column: Clean, Compact Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="login-card mx-auto w-full max-w-[440px] rounded-2xl border border-slate-700/50 bg-[#0B1526]/95 p-6 backdrop-blur-md sm:p-8"
            >
              {/* Mobile-Only Logo Header */}
              <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                <RescueMeshLogo size="lg" showText={false} />
                <p className="mt-2 text-base font-bold tracking-tight text-white">RescueMesh AI</p>
                <p className="text-xs text-blue-400">Flood Emergency Response &amp; Coordination</p>
              </div>

              {/* Card Title & Subtitle */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Welcome Back
                </h2>
                <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
                  Sign in to access the emergency response dashboard.
                </p>
              </div>

              {/* Login Form */}
              <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4 sm:mt-7 sm:space-y-5">
                {/* Email Address */}
                <LoginField
                  id="login-email"
                  name="email"
                  label="Email Address"
                  type="email"
                  icon={Mail}
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => {
                    if (email.trim()) {
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                        setValidationErrors((prev) => ({ ...prev, email: 'Please enter a valid email address.' }));
                      }
                    }
                  }}
                  error={validationErrors.email}
                  placeholder="name@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isSubmitting}
                />

                {/* Password */}
                <LoginField
                  id="login-password"
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={Lock}
                  value={password}
                  onChange={handlePasswordChange}
                  error={validationErrors.password}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={0}
                      className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  }
                />

                {/* Inline Server / Authentication Error Alert */}
                <AnimatePresence initial={false}>
                  {displayError && (
                    <motion.div
                      key="auth-error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <div
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300 sm:text-sm"
                      >
                        <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span>{displayError}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sign In Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/30 transition-all duration-200 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1526] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-blue-600 sm:h-12 sm:text-[15px]"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight
                          aria-hidden="true"
                          className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </div>

                {/* Authorized personnel only notice */}
                <p className="pt-1 text-center text-xs text-slate-400">
                  Authorized personnel only
                </p>
              </form>
            </motion.div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="relative py-4 text-center text-xs text-slate-400 select-none">
          <p>© 2026 RescueMesh AI</p>
        </footer>
      </div>
    </MotionConfig>
  );
};
