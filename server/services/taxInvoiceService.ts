/**
 * Tax Invoice Processing Service
 * Handles Tax Invoice workflow as shown in user's MRP diagram
 */

export interface TaxInvoiceRecord {
  id?: number;
  invoice_number: string;
  delivery_number?: string;
  sales_order_number?: string;
  customer_code: string;
  invoice_date: Date;
  delivery_date: Date;
  plant_code: string;
  sales_organization: string;
  distribution_channel: string;
  division: string;
  net_amount: number;
  tax_amount: number;
  gross_amount: number;
  currency_code: string;
  invoice_status: 'CREATED' | 'PRINTED' | 'POSTED' | 'CANCELLED';
  payment_terms: string;
  due_date: Date;
  created_by: string;
  created_at?: Date;
}

export interface TaxInvoiceLineItems {
  id?: number;
  invoice_number: string;
  line_item_number: string;
  material_code: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  net_value: number;
  tax_code: string;
  tax_percentage: number;
  tax_amount: number;
  plant_code: string;
  storage_location: string;
}

export interface TaxInvoicePrintLog {
  id?: number;
  invoice_number: string;
  print_date: Date;
  printed_by: string;
  print_type: 'ORIGINAL' | 'DUPLICATE' | 'COPY';
  printer_name: string;
  print_status: 'SUCCESS' | 'FAILED';
  error_message?: string;
}

export class TaxInvoiceService {
  
  /**
   * Create Tax Invoice from Delivery
   */
  async createTaxInvoice(deliveryData: any): Promise<TaxInvoiceRecord> {
    // Calculate totals
    const lineItems = await this.createInvoiceLineItems(deliveryData);
    const netAmount = lineItems.reduce((sum, item) => sum + item.net_value, 0);
    const taxAmount = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
    
    const taxInvoice: TaxInvoiceRecord = {
      invoice_number: this.generateInvoiceNumber(),
      delivery_number: deliveryData.delivery_number,
      sales_order_number: deliveryData.sales_order_number,
      customer_code: deliveryData.customer_code,
      invoice_date: new Date(),
      delivery_date: deliveryData.delivery_date,
      plant_code: deliveryData.plant_code,
      sales_organization: deliveryData.sales_organization,
      distribution_channel: deliveryData.distribution_channel,
      division: deliveryData.division,
      net_amount: netAmount,
      tax_amount: taxAmount,
      gross_amount: netAmount + taxAmount,
      currency_code: deliveryData.currency_code || 'USD',
      invoice_status: 'CREATED',
      payment_terms: deliveryData.payment_terms || 'NET30',
      due_date: this.calculateDueDate(deliveryData.payment_terms),
      created_by: 'BILLING_SYSTEM'
    };
    
    return taxInvoice;
  }
  
  /**
   * Create Invoice Line Items
   */
  private async createInvoiceLineItems(deliveryData: any): Promise<TaxInvoiceLineItems[]> {
    const lineItems: TaxInvoiceLineItems[] = [];
    
    for (const item of deliveryData.delivery_items) {
      const taxInfo = await this.getTaxInformation(item.material_code, deliveryData.customer_code);
      
      const lineItem: TaxInvoiceLineItems = {
        invoice_number: '', // Will be set after invoice creation
        line_item_number: item.line_item_number,
        material_code: item.material_code,
        description: item.description,
        quantity: item.delivered_quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        net_value: item.delivered_quantity * item.unit_price,
        tax_code: taxInfo.tax_code,
        tax_percentage: taxInfo.tax_percentage,
        tax_amount: (item.delivered_quantity * item.unit_price) * (taxInfo.tax_percentage / 100),
        plant_code: item.plant_code,
        storage_location: item.storage_location
      };
      
      lineItems.push(lineItem);
    }
    
    return lineItems;
  }
  
  /**
   * Print Tax Invoice
   */
  async printTaxInvoice(invoiceNumber: string, printOptions: any): Promise<TaxInvoicePrintLog> {
    const printLog: TaxInvoicePrintLog = {
      invoice_number: invoiceNumber,
      print_date: new Date(),
      printed_by: printOptions.printed_by,
      print_type: printOptions.print_type || 'ORIGINAL',
      printer_name: printOptions.printer_name || 'DEFAULT_PRINTER',
      print_status: 'SUCCESS'
    };
    
    try {
      // Generate PDF or send to printer
      await this.generateInvoicePDF(invoiceNumber);
      
      // Update invoice status to PRINTED
      await this.updateInvoiceStatus(invoiceNumber, 'PRINTED');
      
      console.log(`Tax Invoice ${invoiceNumber} printed successfully`);
      
    } catch (error) {
      printLog.print_status = 'FAILED';
      printLog.error_message = error.message;
      console.error(`Failed to print Tax Invoice ${invoiceNumber}:`, error);
    }
    
    return printLog;
  }
  
  /**
   * Post Tax Invoice to Accounting
   */
  async postTaxInvoice(invoiceNumber: string): Promise<void> {
    // Create accounting entries
    const accountingEntries = await this.createAccountingEntries(invoiceNumber);
    
    // Post to AR
    await this.postToAccountsReceivable(invoiceNumber, accountingEntries);
    
    // Update inventory if needed
    await this.updateInventoryAfterInvoicing(invoiceNumber);
    
    // Update invoice status
    await this.updateInvoiceStatus(invoiceNumber, 'POSTED');
    
    console.log(`Tax Invoice ${invoiceNumber} posted to accounting`);
  }
  
  /**
   * Get Tax Information
   */
  private async getTaxInformation(materialCode: string, customerCode: string): Promise<any> {
    // This would look up tax codes based on material and customer
    return {
      tax_code: 'V1', // Standard VAT
      tax_percentage: 18.0
    };
  }
  
  /**
   * Generate Invoice PDF
   */
  private async generateInvoicePDF(invoiceNumber: string): Promise<void> {
    // PDF generation logic would go here
    console.log(`Generated PDF for invoice ${invoiceNumber}`);
  }
  
  /**
   * Create Accounting Entries
   */
  private async createAccountingEntries(invoiceNumber: string): Promise<any[]> {
    // Create DR/CR entries for GL posting
    return [
      {
        account_number: '120001', // Accounts Receivable
        debit_amount: 1000,
        credit_amount: 0
      },
      {
        account_number: '410001', // Revenue
        debit_amount: 0,
        credit_amount: 847.46
      },
      {
        account_number: '230001', // Tax Payable
        debit_amount: 0,
        credit_amount: 152.54
      }
    ];
  }
  
  /**
   * Post to Accounts Receivable
   */
  private async postToAccountsReceivable(invoiceNumber: string, entries: any[]): Promise<void> {
    console.log(`Posted ${invoiceNumber} to AR with ${entries.length} entries`);
  }
  
  /**
   * Update Inventory After Invoicing
   */
  private async updateInventoryAfterInvoicing(invoiceNumber: string): Promise<void> {
    // Update inventory valuation, cost of goods sold, etc.
    console.log(`Updated inventory for invoice ${invoiceNumber}`);
  }
  
  /**
   * Update Invoice Status
   */
  private async updateInvoiceStatus(invoiceNumber: string, status: string): Promise<void> {
    console.log(`Updated invoice ${invoiceNumber} status to ${status}`);
  }
  
  /**
   * Calculate Due Date
   */
  private calculateDueDate(paymentTerms: string): Date {
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    
    switch (paymentTerms) {
      case 'NET30':
        dueDate.setDate(dueDate.getDate() + 30);
        break;
      case 'NET15':
        dueDate.setDate(dueDate.getDate() + 15);
        break;
      case 'NET60':
        dueDate.setDate(dueDate.getDate() + 60);
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30);
    }
    
    return dueDate;
  }
  
  /**
   * Generate Invoice Number
   */
  private generateInvoiceNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${new Date().getFullYear()}-${timestamp}`;
  }
  
  /**
   * Get Tax Invoice Dashboard Data
   */
  async getTaxInvoiceDashboard(): Promise<any> {
    return {
      totalInvoices: 0,
      createdInvoices: 0,
      printedInvoices: 0,
      postedInvoices: 0,
      totalValue: 0,
      pendingPrint: 0
    };
  }
}

export const taxInvoiceService = new TaxInvoiceService();