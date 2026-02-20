import { Request, Response } from 'express';
import { createEmailSubscription, findEmailSubscriptionByEmail, reactivateEmailSubscription } from '../repositories/email-subscription.repo';
import { sendEmail } from '../services/email.service';

export async function subscribeEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    // Check if email already exists
    const existingSubscription = await findEmailSubscriptionByEmail(email);

    if (existingSubscription) {
      if (existingSubscription.is_active) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our updates',
        });
      } else {
        // Reactivate subscription
        await reactivateEmailSubscription(email);
        return res.status(200).json({
          success: true,
          message: 'Your subscription has been reactivated. Welcome back!',
        });
      }
    }

    // Create new subscription
    const subscription = await createEmailSubscription(email);

    // Send welcome email
    try {
      await sendEmail(
        email,
        'Welcome to ParadisePay - Stay Tuned for Updates!',
        `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ParadisePay</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            }
            .email-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 40px 30px;
              text-align: center;
            }
            .email-header h1 {
              color: white;
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .email-body {
              padding: 40px 30px;
            }
            .email-body h2 {
              color: #2d3748;
              margin-top: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .email-body p {
              color: #4a5568;
              margin-bottom: 20px;
              font-size: 16px;
            }
            .highlight-box {
              background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
              border-left: 4px solid #667eea;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .email-footer {
              background-color: #f8f9fa;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e2e8f0;
            }
            .footer-text {
              color: #718096;
              font-size: 13px;
              line-height: 1.5;
              margin-top: 15px;
            }
            .footer-links {
              margin: 15px 0;
            }
            .footer-links a {
              color: #667eea;
              text-decoration: none;
              margin: 0 10px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="email-header">
              <h1>ParadisePay</h1>
            </div>
            
            <div class="email-body">
              <h2>Thank You for Your Interest! 🎉</h2>
              
              <p>Hello there,</p>
              
              <p>We're thrilled that you're interested in ParadisePay! You've successfully subscribed to receive regular updates about our platform.</p>
              
              <div class="highlight-box">
                <p style="margin: 0; font-weight: 600; color: #2d3748;">What to expect:</p>
                <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4a5568;">
                  <li>Early access announcements</li>
                  <li>Feature updates and releases</li>
                  <li>Exclusive launch offers</li>
                  <li>Tips and insights about digital payments and event ticketing</li>
                </ul>
              </div>
              
              <p>We're working hard to bring you an amazing experience with ParadisePay. Stay tuned for exciting updates coming your way!</p>
              
              <p>If you have any questions or feedback, feel free to reach out to us anytime.</p>
              
              <p>Best regards,<br>
              <strong>The ParadisePay Team</strong></p>
            </div>
            
            <div class="email-footer">
              <div class="footer-links">
                <a href="https://paradisepay.com">Website</a>
                <a href="https://paradisepay.com/help">Help Center</a>
                <a href="https://paradisepay.com/privacy">Privacy Policy</a>
                <a href="https://paradisepay.com/terms">Terms of Service</a>
              </div>
              
              <div class="footer-text">
                <p>© ${new Date().getFullYear()} ParadisePay. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
                <p>If you have any questions, contact us at <a href="mailto:support@paradisepay.com" style="color: #667eea;">support@paradisepay.com</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the subscription if email fails, just log it
    }

    return res.status(201).json({
      success: true,
      message: 'Successfully subscribed! Check your email for a confirmation.',
      data: {
        email: subscription.email,
        subscribed_at: subscription.subscribed_at,
      },
    });
  } catch (error) {
    console.error('Subscribe email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

