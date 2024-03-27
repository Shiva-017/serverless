const mysql = require('mysql');
const mailgun = require('mailgun-js');

// Configure your Mailgun domain and API key
const DOMAIN = process.env.MAILGUN_DOMAIN;
const mg = mailgun({ apiKey: process.env.MAILGUN_API_KEY, domain: DOMAIN });

// MySQL connection configuration
const pool = mysql.createPool({
  connectionLimit: 1,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  socketPath: `/cloudsql/webapp-dev-414902:us-east1:vpc1-cloudsql-instance`,
});

exports.verifyEmailFunction = async (pubSubEvent, context) => {
    const message = JSON.parse(Buffer.from(pubSubEvent.data, 'base64').toString());
    const { email, token, firstname: userName } = message;

    // Generate a verification link
    const verificationLink = `http://shivadasi.me:3000/verify/${token}`;

    const emailData = {
        from: 'Exciting WebApp <no-reply@yourdomain.com>',
        to: email,
        subject: `Welcome to Exciting WebApp, ${userName}! Please Verify Your Email`,
        html: `<html>
                <body>
                    <p>Hello ${userName},</p>
                    <p>Welcome to our exciting web app! Please verify your email address by clicking on the link below:</p>
                    <a href="${verificationLink}">Verify Email</a>
                    <p>Thank you!</p>
                </body>
               </html>`
    };

    try {
        await mg.messages().send(emailData);
        console.log(`Verification email sent to ${email}`);
        
        // Log email sent time in Cloud SQL
        const currentTime = new Date();
        pool.query(
          'UPDATE Users SET verificationSentTime = ? WHERE username = ?',
          [currentTime, email],
          (error, results) => {
            if (error) {
              console.error('Failed to update verificationSentTime in DB:', error);
            } else {
              console.log(`Email sent time updated for ${email}`);
            }
          }
        );
    } catch (error) {
        console.error(`Failed to send verification email to ${email}: `, error);
    }
};
