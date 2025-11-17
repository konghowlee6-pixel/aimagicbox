import { Link } from 'wouter';
import { Sparkles } from 'lucide-react';

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p style={{ fontSize: '14px', color: '#999', marginBottom: '32px' }}>
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div style={{ lineHeight: '1.8', color: '#555' }}>
            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using AI MagicBox, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              2. Use License
            </h2>
            <p>
              Permission is granted to temporarily use AI MagicBox for personal, non-commercial purposes. This is the grant of a license, not a transfer of title.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              3. User Account
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              4. Prohibited Uses
            </h2>
            <p>
              You may not use AI MagicBox:
            </p>
            <ul style={{ marginLeft: '20px' }}>
              <li>For any unlawful purpose</li>
              <li>To violate any international, federal, provincial or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
            </ul>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              5. Intellectual Property
            </h2>
            <p>
              The service and its original content, features, and functionality are and will remain the exclusive property of AI MagicBox and its licensors.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              6. Termination
            </h2>
            <p>
              We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              7. Limitation of Liability
            </h2>
            <p>
              In no event shall AI MagicBox, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              8. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify or replace these terms at any time. We will provide notice of any changes by posting the new terms on this page.
            </p>

            <h2 style={{ fontSize: '24px', marginTop: '32px', marginBottom: '16px', color: '#333' }}>
              9. Contact Us
            </h2>
            <p>
              If you have any questions about these Terms, please contact us at support@aimagicbox.com
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
