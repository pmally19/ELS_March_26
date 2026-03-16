import express from 'express';
import { salesEmailService } from '../../services/sales-email-service';

const router = express.Router();

/**
 * Test email functionality
 * POST /api/sales/test-email
 */
router.post('/test-email', async (req, res) => {
    try {
        const nodemailer = await import('nodemailer');

        console.log('\n🧪 Testing email service...\n');

        // Create test account
        const testAccount = await nodemailer.createTestAccount();

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });

        // Send test email
        const info = await transporter.sendMail({
            from: '"MRF Sales" <salesrmf@mrf.com>',
            to: testAccount.user,
            subject: '✅ Email Test - MRF ERP System',
            text: 'This is a test email from your MRF ERP quotation management system.\n\nIf you can see this, email functionality is working correctly!',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Email Test Successful!</h2>
          <p>This is a test email from your <strong>MRF ERP Quotation Management System</strong>.</p>
          <p>If you can see this, your email functionality is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            Email Service: Ethereal Email (Free Test Service)<br>
            Message ID: ${info.messageId}
          </p>
        </div>
      `
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);

        res.json({
            success: true,
            message: 'Test email sent successfully!',
            testAccount: {
                user: testAccount.user,
                pass: testAccount.pass
            },
            messageId: info.messageId,
            previewUrl: previewUrl,
            instructions: 'Open the preview URL to see the email. This URL is valid for 7 days.'
        });

        console.log('✅ Test email sent!');
        console.log('📬 Preview at:', previewUrl);

    } catch (error: any) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send test email'
        });
    }
});

/**
 * Send quotation email
 * POST /api/sales/email/quotation/:id
 */
router.post('/quotation/:id', async (req, res) => {
    try {
        const quotationId = parseInt(req.params.id);

        if (isNaN(quotationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid quotation ID'
            });
        }

        const emailSent = await salesEmailService.sendQuotationEmail(quotationId);

        res.json({
            success: true,
            message: 'Quotation email sent successfully',
            emailSent
        });
    } catch (error: any) {
        console.error('Error sending quotation email:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send quotation email'
        });
    }
});

/**
 * Send order confirmation email
 * POST /api/sales/email/order/:id
 */
router.post('/order/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);

        if (isNaN(orderId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid order ID'
            });
        }

        const emailSent = await salesEmailService.sendOrderConfirmationEmail(orderId);

        res.json({
            success: true,
            message: 'Order confirmation email sent successfully',
            emailSent
        });
    } catch (error: any) {
        console.error('Error sending order email:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to send order email'
        });
    }
});

export default router;
