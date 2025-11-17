import nodemailer from 'nodemailer';

console.log('🔍 SMTP Connection Diagnostic Tool\n');

const configs = [
  {
    name: 'Port 587 (STARTTLS)',
    config: {
      host: 'mail.arriival.com',
      port: 587,
      secure: false,
      auth: {
        user: 'careteam@arriival.com',
        pass: 'Lin!!8899!@#!@#',
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    },
  },
  {
    name: 'Port 465 (SSL/TLS)',
    config: {
      host: 'mail.arriival.com',
      port: 465,
      secure: true,
      auth: {
        user: 'careteam@arriival.com',
        pass: 'Lin!!8899!@#!@#',
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    },
  },
  {
    name: 'Port 25 (Plain)',
    config: {
      host: 'mail.arriival.com',
      port: 25,
      secure: false,
      auth: {
        user: 'careteam@arriival.com',
        pass: 'Lin!!8899!@#!@#',
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    },
  },
];

async function testConfig(name, config) {
  console.log(`\n📧 Testing: ${name}`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Secure: ${config.secure}`);
  console.log(`   User: ${config.auth.user}`);

  try {
    const transporter = nodemailer.createTransport(config);
    
    console.log('   ⏳ Verifying connection...');
    await transporter.verify();
    
    console.log('   ✅ Connection successful!');
    
    console.log('   ⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: '"AI MagicBox" <careteam@arriival.com>',
      to: 'konghow@arriival.com',
      subject: 'SMTP Test Email',
      text: 'This is a test email from AI MagicBox SMTP diagnostic tool.',
      html: '<p>This is a test email from <strong>AI MagicBox</strong> SMTP diagnostic tool.</p>',
    });
    
    console.log('   ✅ Email sent successfully!');
    console.log('   📨 Message ID:', info.messageId);
    console.log('   📬 Accepted:', info.accepted);
    console.log('   ❌ Rejected:', info.rejected);
    
    return true;
  } catch (error) {
    console.log('   ❌ Failed:', error.message);
    if (error.code) {
      console.log('   🔴 Error code:', error.code);
    }
    return false;
  }
}

async function runDiagnostics() {
  console.log('Starting SMTP diagnostics...\n');
  console.log('=' .repeat(60));

  for (const { name, config } of configs) {
    const success = await testConfig(name, config);
    if (success) {
      console.log('\n✅ Found working configuration!');
      console.log('=' .repeat(60));
      process.exit(0);
    }
  }

  console.log('\n❌ No working configuration found.');
  console.log('=' .repeat(60));
  console.log('\n💡 Suggestions:');
  console.log('   1. Check if SMTP server allows connections from Railway IP');
  console.log('   2. Verify SMTP credentials are correct');
  console.log('   3. Check if firewall is blocking the connection');
  console.log('   4. Contact arriival.com email administrator');
  process.exit(1);
}

runDiagnostics();
