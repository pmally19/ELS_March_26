import { pool } from '../db';

/**
 * Dunning Email Service
 * Handles email template rendering and placeholder replacement
 */

interface DunningEmailData {
    customerName: string;
    customerEmail: string;
    amount: number;
    daysOverdue: number;
    dunningLevel: number;
    invoiceNumbers?: string[];
}

interface EmailTemplate {
    subject: string;
    body_html: string;
    body_text: string;
}

/**
 * Get email template for dunning level
 */
export async function getDunningEmailTemplate(
    dunningLevel: number,
    languageCode: string = 'en'
): Promise<EmailTemplate | null> {
    try {
        const result = await pool.query(
            `SELECT subject, body_html, body_text
       FROM dunning_email_templates
       WHERE dunning_level = $1
       AND language_code = $2
       AND is_active = true
       LIMIT 1`,
            [dunningLevel, languageCode]
        );

        if (result.rows.length === 0) {
            console.warn(`No email template found for level ${dunningLevel}, language ${languageCode}`);
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error fetching email template:', error);
        throw error;
    }
}

/**
 * Replace placeholders in template
 */
function replacePlaceholders(template: string, data: DunningEmailData): string {
    return template
        .replace(/\[CustomerName\]/g, data.customerName)
        .replace(/\[Amount\]/g, `$${data.amount.toFixed(2)}`)
        .replace(/\[DaysOverdue\]/g, data.daysOverdue.toString())
        .replace(/\[InvoiceNumbers\]/g, data.invoiceNumbers?.join(', ') || 'N/A');
}

/**
 * Render dunning email
 */
export async function renderDunningEmail(
    dunningLevel: number,
    data: DunningEmailData,
    languageCode: string = 'en'
): Promise<{ subject: string; bodyHtml: string; bodyText: string } | null> {
    const template = await getDunningEmailTemplate(dunningLevel, languageCode);

    if (!template) {
        return null;
    }

    return {
        subject: replacePlaceholders(template.subject, data),
        bodyHtml: replacePlaceholders(template.body_html, data),
        bodyText: replacePlaceholders(template.body_text, data),
    };
}

/**
 * Send dunning email (placeholder - implement with your email service)
 * 
 * To enable actual email sending:
 * 1. Install email service: npm install @sendgrid/mail (or nodemailer)
 * 2. Add API key to .env: SENDGRID_API_KEY=your_key
 * 3. Uncomment the SendGrid code below
 */
export async function sendDunningEmail(
    dunningHistoryId: number,
    data: DunningEmailData
): Promise<boolean> {
    try {
        const email = await renderDunningEmail(data.dunningLevel, data);

        if (!email) {
            console.error('Could not render email template');
            return false;
        }

        console.log(`📧 Dunning Email (Level ${data.dunningLevel})`);
        console.log(`   To: ${data.customerEmail}`);
        console.log(`   Subject: ${email.subject}`);
        console.log(`   Amount: $${data.amount.toFixed(2)}`);
        console.log(`   Days Overdue: ${data.daysOverdue}`);

        // SENDGRID IMPLEMENTATION (uncomment when ready):
        /*
        import sgMail from '@sendgrid/mail';
        sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
        
        await sgMail.send({
          to: data.customerEmail,
          from: process.env.DUNNING_FROM_EMAIL || 'accounting@yourcompany.com',
          subject: email.subject,
          html: email.bodyHtml,
          text: email.bodyText,
        });
        */

        // NODEMAILER IMPLEMENTATION (alternative):
        /*
        import nodemailer from 'nodemailer';
        
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        
        await transporter.sendMail({
          from: process.env.DUNNING_FROM_EMAIL,
          to: data.customerEmail,
          subject: email.subject,
          html: email.bodyHtml,
          text: email.bodyText,
        });
        */

        // Update dunning history to mark email sent
        await pool.query(
            `UPDATE dunning_history
       SET email_sent = true, 
           email_sent_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [dunningHistoryId]
        );

        console.log('   ✅ Email logged (actual sending disabled - see comments in code to enable)');

        return true;
    } catch (error) {
        console.error('Error sending dunning email:', error);
        return false;
    }
}

/**
 * Send dunning notice via email and/or letter
 */
export async function sendDunningNotice(
    dunningHistoryId: number,
    customerId: number,
    customerName: string,
    customerEmail: string,
    amount: number,
    daysOverdue: number,
    dunningLevel: number,
    sendEmail: boolean = true,
    sendLetter: boolean = false
): Promise<{ emailSent: boolean; letterSent: boolean }> {
    const result = {
        emailSent: false,
        letterSent: false,
    };

    if (sendEmail && customerEmail) {
        result.emailSent = await sendDunningEmail(dunningHistoryId, {
            customerName,
            customerEmail,
            amount,
            daysOverdue,
            dunningLevel,
        });
    }

    if (sendLetter) {
        // PDF generation would go here
        console.log(`📄 Dunning Letter (Level ${dunningLevel}) - PDF generation not yet implemented`);
        // Mark as sent anyway for now
        await pool.query(
            `UPDATE dunning_history
       SET letter_sent = true,
           letter_sent_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
            [dunningHistoryId]
        );
        result.letterSent = true;
    }

    return result;
}
