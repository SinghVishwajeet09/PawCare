import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, LockKeyhole, Mail, PawPrint, Phone, ShieldCheck, UserRound } from 'lucide-react';
import { apiFetch, saveSession } from '../api';
import { auth, googleProvider, isFirebaseReady, requestForToken, signInWithPopup } from '../firebase';

const initialSignup = {
  name: '',
  phone: '',
  email: '',
  password: ''
};

const initialSignin = {
  email: '',
  password: ''
};

const Auth = () => {
  const [mode, setMode] = useState('signin');
  const [signup, setSignup] = useState(initialSignup);
  const [signin, setSignin] = useState(initialSignin);
  const [verification, setVerification] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) navigate('/home');
  }, [navigate]);

  const title = useMemo(() => {
    if (verification) return verification.purpose === 'login' ? 'Verify Sign In' : 'Verify Email';
    return mode === 'signin' ? 'Sign In' : 'Create Account';
  }, [mode, verification]);

  const syncNotificationToken = () => {
    requestForToken()
      .then((fcmToken) => {
        if (!fcmToken) return null;
        return apiFetch('/auth/fcm-token', {
          method: 'PUT',
          body: JSON.stringify({ fcmToken })
        });
      })
      .catch((err) => {
        console.warn('Notification token sync skipped:', err.message);
      });
  };

  const completeLogin = (data) => {
    saveSession(data);
    navigate('/home');
    window.setTimeout(syncNotificationToken, 0);
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(signup)
      });
      setVerification({ email: data.email, purpose: data.purpose });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(signin)
      });
      setVerification({ email: data.email, purpose: data.purpose });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!verification) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const path = verification.purpose === 'login' ? '/auth/verify-login' : '/auth/verify-email';
      const data = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({ email: verification.email, code })
      });
      completeLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!isFirebaseReady || !auth || !googleProvider) {
        throw new Error('Firebase web config is missing. Add frontend .env values first.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      const data = await apiFetch('/auth/firebase', {
        method: 'POST',
        body: JSON.stringify({ idToken })
      });
      completeLogin(data);
    } catch (err) {
      setError(err.message || 'Google sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!verification?.email) return;
    setLoading(true);
    setError('');

    try {
      const data = await apiFetch('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: verification.email })
      });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSignup = (field) => (event) => setSignup((current) => ({
    ...current,
    [field]: event.target.value
  }));

  const updateSignin = (field) => (event) => setSignin((current) => ({
    ...current,
    [field]: event.target.value
  }));

  return (
    <main className="auth-shell">
      <section className="auth-visual">
        <div className="brand-lockup">
          <PawPrint size={38} />
          <span>PawCare</span>
        </div>
        <h1>Rescue, feed, and connect with verified local help.</h1>
        <div className="auth-stats">
          <div>
            <strong>CSV</strong>
            <span>NGO directory</span>
          </div>
          <div>
            <strong>OTP</strong>
            <span>Email protected</span>
          </div>
          <div>
            <strong>GPS</strong>
            <span>Location reports</span>
          </div>
        </div>
      </section>

      <section className="auth-panel" aria-label={title}>
        <div className="segmented">
          <button type="button" className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setVerification(null); }}>
            Sign in
          </button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setVerification(null); }}>
            Sign up
          </button>
        </div>

        <div className="panel-heading">
          <h2>{title}</h2>
          <p>{verification ? verification.email : 'Use email verification or Google OAuth.'}</p>
        </div>

        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        {verification ? (
          <form className="form-stack" onSubmit={handleVerify}>
            <label className="input-with-icon">
              <KeyRound size={18} />
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                minLength="6"
                maxLength="6"
                placeholder="6-digit code"
                required
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              <ShieldCheck size={18} />
              {loading ? 'Verifying...' : 'Verify and continue'}
            </button>
            {verification.purpose !== 'login' && (
              <button className="btn btn-ghost" type="button" onClick={handleResend} disabled={loading}>
                Resend code
              </button>
            )}
          </form>
        ) : mode === 'signup' ? (
          <form className="form-stack" onSubmit={handleSignup}>
            <label className="input-with-icon">
              <UserRound size={18} />
              <input value={signup.name} onChange={updateSignup('name')} placeholder="Full name" required />
            </label>
            <label className="input-with-icon">
              <Phone size={18} />
              <input value={signup.phone} onChange={updateSignup('phone')} placeholder="Phone number" required />
            </label>
            <label className="input-with-icon">
              <Mail size={18} />
              <input type="email" value={signup.email} onChange={updateSignup('email')} placeholder="Email address" required />
            </label>
            <label className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" value={signup.password} onChange={updateSignup('password')} placeholder="Password" minLength="8" required />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending code...' : 'Create account'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleSignin}>
            <label className="input-with-icon">
              <Mail size={18} />
              <input type="email" value={signin.email} onChange={updateSignin('email')} placeholder="Email address" required />
            </label>
            <label className="input-with-icon">
              <LockKeyhole size={18} />
              <input type="password" value={signin.password} onChange={updateSignin('password')} placeholder="Password" required />
            </label>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending code...' : 'Sign in'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}

        {!verification && (
          <>
            <div className="divider"><span>or</span></div>
            <button className="btn btn-secondary google-btn" type="button" onClick={handleGoogle} disabled={loading || !isFirebaseReady}>
              Continue with Google
            </button>
            {!isFirebaseReady && <p className="setup-note">Firebase web config required for Google OAuth.</p>}
          </>
        )}
      </section>
    </main>
  );
};

export default Auth;
