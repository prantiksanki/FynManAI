import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

export default function AuthModal({ defaultTab = 'signup', onClose }) {
  const [tab, setTab] = useState(defaultTab);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSuccess(credentialResponse) {
    login(credentialResponse);
    navigate('/dashboard');
  }

  function handleError() {
    setError('Google sign-in failed. Please try again.');
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="auth-overlay" onClick={handleOverlayClick}>
      <div className="auth-modal" role="dialog" aria-modal="true">
        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="auth-brand">
          <span className="auth-brand-icon">◈</span>
          <span className="auth-brand-name">VisualMind</span>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'signup' ? 'auth-tab--active' : ''}`}
            onClick={() => { setTab('signup'); setError(''); }}
          >
            Sign Up
          </button>
          <button
            className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Log In
          </button>
        </div>

        <div className="auth-body">
          <p className="auth-heading">
            {tab === 'signup' ? 'Create your account' : 'Welcome back'}
          </p>
          <p className="auth-sub">
            {tab === 'signup'
              ? 'Sign up with Google to start building visual canvases.'
              : 'Sign in with Google to continue where you left off.'}
          </p>

          <div className="auth-google-wrap">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap={false}
              theme="filled_black"
              size="large"
              width="320"
              text={tab === 'signup' ? 'signup_with' : 'signin_with'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <p className="auth-switch">
            {tab === 'signup' ? (
              <>Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => { setTab('login'); setError(''); }}>
                  Log in
                </button>
              </>
            ) : (
              <>No account yet?{' '}
                <button className="auth-switch-btn" onClick={() => { setTab('signup'); setError(''); }}>
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>

        <p className="auth-legal">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
