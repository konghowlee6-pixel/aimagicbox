import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react';

export default function EmailVerified() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get token from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token provided.');
      return;
    }

    // Verify the email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully! Welcome to AI MagicBox.');
          // Redirect to aimagicbox.com after 3 seconds
          setTimeout(() => {
            window.location.href = 'https://www.aimagicbox.com';
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      })
      .catch(err => {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('Network error. Please try again later.');
      });
  }, []);

  return (
    <div style={{
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#5e2ec3',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        maxWidth: '480px',
        width: '100%',
        padding: '40px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        textAlign: 'center' as const
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8e2ec3, #e94ec7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={40} color="#ffd700" />
          </div>
        </div>

        <h1 style={{ fontSize: '28px', marginBottom: '8px', color: '#333' }}>
          AI MagicBox
        </h1>
        <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
          Email Verification
        </p>

        {/* Status Icon */}
        <div style={{ marginBottom: '24px' }}>
          {status === 'loading' && (
            <div style={{ fontSize: '16px', color: '#666' }}>
              Verifying your email...
            </div>
          )}
          {status === 'success' && (
            <div>
              <CheckCircle size={64} color="#4caf50" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '24px', color: '#4caf50', marginBottom: '12px' }}>
                ✅ Success!
              </h2>
            </div>
          )}
          {status === 'error' && (
            <div>
              <XCircle size={64} color="#d32f2f" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '24px', color: '#d32f2f', marginBottom: '12px' }}>
                Verification Failed
              </h2>
            </div>
          )}
        </div>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '32px',
          lineHeight: '1.5'
        }}>
          {message}
        </p>

        {/* Actions */}
        {status === 'success' && (
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '24px' }}>
            Redirecting to AI MagicBox in 3 seconds...
          </p>
        )}

        <div style={{ marginTop: '24px' }}>
          <a href="https://www.aimagicbox.com" style={{
            display: 'inline-block',
            padding: '14px 32px',
            fontSize: '16px',
            color: '#fff',
            background: 'linear-gradient(90deg, #8e2ec3, #2e8efc)',
            border: 'none',
            borderRadius: '8px',
            textDecoration: 'none',
            cursor: 'pointer'
          }}>
            Go to AI MagicBox
          </a>
        </div>

        {status === 'error' && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Need help?{' '}
              <Link to="/register">
                <a style={{ color: '#5e2ec3', textDecoration: 'none', cursor: 'pointer' }}>
                  Try registering again
                </a>
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
