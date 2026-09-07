import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, SignIn, useAuth, useUser } from '@clerk/react';
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

function AuthenticatedApp() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  configureApiAuth(getToken);
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
        <SignIn routing="hash" forceRedirectUrl="/" />
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
