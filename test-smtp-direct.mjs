import nodemailer from 'nodemailer';

// 使用你修改后的配置
const SMTP_CONFIG = {
  host: 'mail.arriival.com',  // arriival.com的邮件服务器
  port: 465,
  secure: true,  // SSL
  auth: {
    user: 'aimagicbox@arriival.com',
    pass: 'Arr!!9394!@#',
  },
  connectionTimeout: 60000,
  greetingTimeout: 60000,
  socketTimeout: 120000,
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
};

console.log('🔧 SMTP Configuration:');
console.log('Host:', SMTP_CONFIG.host);
console.log('Port:', SMTP_CONFIG.port);
console.log('Secure:', SMTP_CONFIG.secure);
console.log('User:', SMTP_CONFIG.auth.user);
console.log('');

async function testSMTP() {
  try {
    console.log('📧 Creating transporter...');
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    console.log('✅ Transporter created');
    console.log('');
    
    console.log('🔌 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    console.log('');
    
    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: '"AI MagicBox Test" <aimagicbox@arriival.com>',
      to: 'konghow@arriival.com',  // 发送到你的邮箱测试
      subject: 'SMTP Test - AI MagicBox',
      html: `
        <h1>✅ SMTP Test Successful!</h1>
        <p>This is a test email from AI MagicBox using direct SMTP connection.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>Host: ${SMTP_CONFIG.host}</li>
          <li>Port: ${SMTP_CONFIG.port}</li>
          <li>Secure: ${SMTP_CONFIG.secure}</li>
          <li>From: ${SMTP_CONFIG.auth.user}</li>
        </ul>
        <p>Time: ${new Date().toISOString()}</p>
      `,
      text: 'SMTP Test Successful! This email was sent using direct SMTP connection.',
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('Response:', info.response);
    console.log('');
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ SMTP Test Failed:');
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    if (error.command) {
      console.error('Failed Command:', error.command);
    }
    console.error('');
    console.error('Full Error:', error);
    process.exit(1);
  }
}

testSMTP();
