import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div style={{
      margin: 0,
      padding: 0,
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: '#5e2ec3',
        padding: '20px 0',
        marginBottom: '40px'
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8e2ec3, #e94ec7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={20} color="#ffd700" />
          </div>
          <h1 style={{ fontSize: '24px', color: '#fff', margin: 0 }}>
            AI MagicBox
          </h1>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto 40px',
        padding: '0 20px'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#333' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '32px' }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div style={{ lineHeight: '1.8', color: '#555' }}>
            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us, including:
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Name and email address when you create an account</li>
              <li>Profile information and preferences</li>
              <li>Content you create using our services</li>
              <li>Communications with us</li>
            </ul>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              2. How We Use Your Information
            </h2>
            <p>
              We use the information we collect to:
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Provide, maintain, and improve our services</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Develop new features and services</li>
              <li>Protect against fraud and abuse</li>
            </ul>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              3. Information Sharing
            </h2>
            <p>
              We do not share your personal information with third parties except:
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>With your consent</li>
              <li>To comply with legal obligations</li>
              <li>To protect our rights and prevent fraud</li>
              <li>With service providers who assist in our operations</li>
            </ul>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              4. Data Security
            </h2>
            <p>
              We take reasonable measures to help protect your personal information from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              5. Data Retention
            </h2>
            <p>
              We retain your personal information for as long as necessary to provide our services and for legitimate business purposes.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              6. Your Rights
            </h2>
            <p>
              You have the right to:
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>Access and update your personal information</li>
              <li>Delete your account</li>
              <li>Opt-out of marketing communications</li>
              <li>Request a copy of your data</li>
            </ul>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              7. Cookies
            </h2>
            <p>
              We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              8. Children's Privacy
            </h2>
            <p>
              Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              9. Changes to This Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              10. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at privacy@aimagicbox.com
            </p>
          </div>

          <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #e0e0e0', textAlign: 'center' as const }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                fontSize: '14px',
                color: '#fff',
                background: 'linear-gradient(90deg, #8e2ec3, #2e8efc)',
                border: 'none',
                borderRadius: '8px',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
