import { db } from '../db';
import { sql } from 'drizzle-orm';

interface EmailTemplate {
    id: number;
    template_code: string;
    template_name: string;
    from_address: string;
    subject_template: string;
    body_template: string;
    placeholders: any;
    is_active: boolean;
}

interface EmailData {
    [key: string]: any;
}

/**
 * Sales Email Service
 * Handles email sending for quotations and sales orders
 */
export class SalesEmailService {

    /**
     * Get email template by code
     */
    async getTemplate(templateCode: string): Promise<EmailTemplate | null> {
        try {
            const result = await db.execute(sql`
        SELECT * FROM sd_email_templates
        WHERE template_code = ${templateCode}
        AND is_active = TRUE
        LIMIT 1
      `);

            return result.rows[0] as EmailTemplate || null;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    /**
     * Replace placeholders in template with actual data
     */
    replacePlaceholders(template: string, data: EmailData): string {
        let result = template;

        // Replace all {placeholder} occurrences
        Object.keys(data).forEach(key => {
            const placeholder = `{${key}}`;
            const value = data[key] || '';
            result = result.replace(new RegExp(placeholder, 'g'), String(value));
        });

        return result;
    }

    /**
     * Send quotation email to customer
     */
    async sendQuotationEmail(quotationId: number): Promise<boolean> {
        try {
            // Get quotation details
            const quotationResult = await db.execute(sql`
        SELECT 
          q.*,
          c.name as customer_name,
          c.email as customer_email
        FROM quotations q
        LEFT JOIN erp_customers c ON q.customer_id = c.id
        WHERE q.id = ${quotationId}
      `);

            if (!quotationResult.rows[0]) {
                throw new Error('Quotation not found');
            }

            const quotation = quotationResult.rows[0] as any;

            if (!quotation.customer_email) {
                throw new Error('Customer email not found');
            }

            // Get template
            const template = await this.getTemplate('QUOTATION_EMAIL');
            if (!template) {
                throw new Error('Quotation email template not found');
            }

            // Prepare template data
            const templateData = {
                quotationNumber: quotation.quotation_number,
                customerName: quotation.customer_name,
                totalAmount: quotation.total_amount,
                validUntil: new Date(quotation.valid_until_date).toLocaleDateString(),
                quotationDate: new Date(quotation.quotation_date).toLocaleDateString()
            };

            // Replace placeholders
            const subject = this.replacePlaceholders(template.subject_template, templateData);
            const body = this.replacePlaceholders(template.body_template, templateData);

            // Send email
            const emailSent = await this.sendEmail({
                to: quotation.customer_email,
                from: template.from_address,
                subject,
                body
            });

            if (emailSent) {
                console.log(`✅ Quotation email sent to ${quotation.customer_email}`);
            }

            return emailSent;

        } catch (error) {
            console.error('Error sending quotation email:', error);
            throw error;
        }
    }

    /**
     * Send order confirmation email to customer
     */
    async sendOrderConfirmationEmail(orderId: number): Promise<boolean> {
        try {
            // Get order details
            const orderResult = await db.execute(sql`
        SELECT 
          o.*,
          c.name as customer_name,
          c.email as customer_email
        FROM sales_orders o
        LEFT JOIN erp_customers c ON o.customer_id = c.id
        WHERE o.id = ${orderId}
      `);

            if (!orderResult.rows[0]) {
                throw new Error('Sales order not found');
            }

            const order = orderResult.rows[0] as any;

            if (!order.customer_email) {
                throw new Error('Customer email not found');
            }

            // Get template
            const template = await this.getTemplate('ORDER_CONFIRMATION_EMAIL');
            if (!template) {
                throw new Error('Order confirmation email template not found');
            }

            // Prepare template data
            const templateData = {
                orderNumber: order.order_number,
                customerName: order.customer_name,
                totalAmount: order.total_amount,
                deliveryDate: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD',
                orderDate: new Date(order.order_date).toLocaleDateString()
            };

            // Replace placeholders
            const subject = this.replacePlaceholders(template.subject_template, templateData);
            const body = this.replacePlaceholders(template.body_template, templateData);

            // Send email
            const emailSent = await this.sendEmail({
                to: order.customer_email,
                from: template.from_address,
                subject,
                body
            });

            if (emailSent) {
                console.log(`✅ Order confirmation email sent to ${order.customer_email}`);
            }

            return emailSent;

        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            throw error;
        }
    }

    /**
   * Generic email sending function using nodemailer
   * Supports both Ethereal Email (testing) and Gmail (production)
   */
    private async sendEmail(params: {
        to: string;
        from: string;
        subject: string;
        body: string;
    }): Promise<boolean> {
        try {
            const nodemailer = await import('nodemailer');

            // Check if SMTP credentials are configured
            const smtpHost = process.env.SMTP_HOST || 'smtp.ethereal.email';
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;

            let transporter;

            // If credentials are not set or are placeholder values, create test account
            if (!smtpUser || !smtpPass || smtpUser === 'auto-generated' || smtpPass === 'auto-generated') {
                console.log('📧 Creating Ethereal test email account...');
                const testAccount = await nodemailer.createTestAccount();

                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });

                console.log('📧 Using Ethereal Email test account:');
                console.log('   Email:', testAccount.user);
                console.log('   Password:', testAccount.pass);
            } else {
                // Use configured SMTP credentials
                transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });

                console.log(`📧 Using configured SMTP: ${smtpHost}`);
            }

            // Send email
            const info = await transporter.sendMail({
                from: params.from,
                to: params.to,
                subject: params.subject,
                text: params.body,
                html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap;">${params.body}</pre>`
            });

            console.log('✅ Email sent successfully!');
            console.log('   Message ID:', info.messageId);

            // If using Ethereal, provide preview URL
            if (smtpHost === 'smtp.ethereal.email' || !smtpUser || smtpUser === 'auto-generated') {
                const previewUrl = nodemailer.getTestMessageUrl(info);
                if (previewUrl) {
                    console.log('📬 Preview email at:', previewUrl);
                    console.log('   (This URL is valid for 7 days)');
                }
            }

            return true;
        } catch (error: any) {
            console.error('❌ Error sending email:', error.message);
            return false;
        }
    }
}

// Export singleton instance
export const salesEmailService = new SalesEmailService();
