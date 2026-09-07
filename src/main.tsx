import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  AuthenticateWithRedirectCallback,
  ClerkProvider,
  useAuth,
  useClerk,
  useUser,
} from '@clerk/react';
import { Github, LoaderCircle } from 'lucide-react';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
import App from './App';
import { configureApiAuth } from './api';
import { Loading, Logo } from './components/ui';

const publishableKey = import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkEnabled = import.meta.env.PROD && Boolean(publishableKey);

function GitHubSignIn() {
  const clerk = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    setLoading(true);
    setError('');
    try {
      const attempt = clerk.client?.signIn;
      if (!attempt) throw new Error('The sign-in service is still loading. Please try again.');
      await attempt.authenticateWithRedirect({
        strategy: 'oauth_github',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (cause) {
      const clerkError = cause as { errors?: { longMessage?: string; message?: string }[] };
      setError(
        clerkError.errors?.[0]?.longMessage ||
          clerkError.errors?.[0]?.message ||
          (cause as Error).message ||
          'GitHub sign-in could not start. Please try again.',
      );
      setLoading(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="sign-in-title">
      <span className="auth-eyebrow">Private workspace</span>
      <h2 id="sign-in-title">Sign in to Slop Meter</h2>
      <p>Use your GitHub account to save repositories, scans, and decisions to your workspace.</p>
      <button
        type="button"
        className="github-sign-in"
        onClick={signIn}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <span className="spin" aria-hidden="true">
            <LoaderCircle size={20} />
          </span>
        ) : (
          <Github size={20} aria-hidden="true" />
        )}
        {loading ? 'Opening GitHub…' : 'Sign in with GitHub'}
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      <small>
        Authentication is handled securely by Clerk. Slop Meter never sees your password.
      </small>
    </section>
  );
}

function AuthenticatedApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  configureApiAuth(getToken);
  if (location.pathname === '/sso-callback') {
    return (
      <AuthenticateWithRedirectCallback signInForceRedirectUrl="/" signUpForceRedirectUrl="/" />
    );
  }
  if (!isLoaded) return <Loading />;
  if (!isSignedIn)
    return (
      <main className="auth-page">
        <div className="auth-intro">
          <Logo />
          <span className="auth-brand">slop meter.</span>
          <h1>A clearer codebase starts here.</h1>
          <p>Sign in to open your private, persistent workspace.</p>
        </div>
        <GitHubSignIn />
      </main>
    );
  return (
    <App
      hosted
      userName={user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Your workspace'}
      userEmail={user?.primaryEmailAddress?.emailAddress || 'Signed in'}
    />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    {clerkEnabled ? (
      <ClerkProvider publishableKey={publishableKey!}>
        <AuthenticatedApp />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
