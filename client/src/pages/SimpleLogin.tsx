import { useState, FormEvent } from 'react';
import { Link } from 'wouter';
import { Sparkles, Eye, EyeOff } from 'lucide-react';

export default function SimpleLogin() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateForm = (): boolean => {
    const newErrors = {
      email: '',
      password: ''
    };
    let isValid = true;

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required.';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/simple-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store the token
        localStorage.setItem('token', data.token);
        // Redirect to dashboard
        window.location.href = '/';
      } else {
        // Show error message
        setErrors(prev => ({
          ...prev,
          email: data.message || 'Login failed. Please try again.'
        }));
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors(prev => ({
        ...prev,
        email: 'Network error. Please try again later.'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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
        maxWidth: '420px',
        width: '100%',
        padding: '40px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        textAlign: 'center' as const
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            width: '90px',
            height: '90px',
            margin: '0 auto',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8e2ec3, #e94ec7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={45} color="#ffd700" />
          </div>
        </div>

        <h1 style={{ fontSize: '30px', marginBottom: '10px', color: '#333', lineHeight: '1.3' }}>
          AI MagicBox
        </h1>
        <p style={{ fontSize: '17px', color: '#666', marginBottom: '32px', lineHeight: '1.5' }}>
          Create Stunning Marketing Campaigns with AI
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ textAlign: 'left' as const, marginBottom: '22px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#333' }}>
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              required
              autoComplete="username"
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                border: `1px solid ${errors.email ? '#d32f2f' : '#ccc'}`,
                borderRadius: '6px',
                boxSizing: 'border-box' as const
              }}
            />
            {errors.email && (
              <div style={{ color: '#d32f2f', fontSize: '13px', marginTop: '6px' }}>
                {errors.email}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ textAlign: 'left' as const, marginBottom: '22px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', color: '#333' }}>
              Password
            </label>
            <div style={{ position: 'relative' as const }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '14px',
                  paddingRight: '45px',
                  fontSize: '15px',
                  border: `1px solid ${errors.password ? '#d32f2f' : '#ccc'}`,
                  borderRadius: '6px',
                  boxSizing: 'border-box' as const
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute' as const,
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={20} color="#666" /> : <Eye size={20} color="#666" />}
              </button>
            </div>
            {errors.password && (
              <div style={{ color: '#d32f2f', fontSize: '13px', marginTop: '6px' }}>
                {errors.password}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              color: '#fff',
              background: loading ? '#ccc' : 'linear-gradient(90deg, #8e2ec3, #2e8efc)',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginTop: '8px'
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
            Don't have an account?{' '}
            <Link to="/register">
              <a style={{ color: '#5e2ec3', textDecoration: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                Sign up now
              </a>
            </Link>
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            <Link to="/forgot-password">
              <a style={{ color: '#5e2ec3', textDecoration: 'none', cursor: 'pointer' }}>
                Forgot password?
              </a>
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
