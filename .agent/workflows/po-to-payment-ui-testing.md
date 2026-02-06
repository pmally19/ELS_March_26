---
description: UI Testing Workflow - PO Creation to Payment Proposals
---

# UI Testing Workflow: Purchase Order Creation to Payment Proposals

This workflow guides you through comprehensive UI testing of the complete procure-to-pay cycle, from creating a purchase order to processing payment proposals.

## Prerequisites

Before starting the testing workflow:

1. **Running Application**: Ensure the application is running with `npm run dev`
2. **Database Setup**: Verify that the database has the necessary master data
3. **Test Data**: 
   - At least one vendor configured
   - Materials/items in the system
   - Company code setup complete
   - GL accounts configured
   - Payment terms defined
4. **User Access**: Login with a user that has permissions for Purchase and Finance modules

---

## Phase 1: Purchase Requisition Creation

**Purpose**: Create and verify purchase requisitions before converting to POs

### Steps:

1. **Navigate to Purchase Requisitions**
   - Click **Dashboard → Purchase** or navigate to `/purchase`
   - Select the **Requisitions** tab
   - Verify the requisitions list loads correctly

2. **Create New Purchase Requisition**
   - Click **+ New Requisition** button
   - Fill in the following fields:
     - Requisition Type (e.g., Standard, Stock Transfer)
     - Material/Item selection
     - Quantity
     - Required by date
     - Requesting department/cost center
   - Click **Create** or **Save**

3. **Verify PR Creation**
   - PR should appear in the requisitions list
   - Note the PR number
   - Verify status is "Open" or "Created"
   - Check that all entered data displays correctly

4. **Optional: Edit/View PR Details**
   - Click on the created PR row
   - Verify PR details dialog opens
   - Check that estimated prices and other details are correct
   - Close dialog

---

## Phase 2: Purchase Order Creation

**Purpose**: Create PO from PR or directly

### Steps:

1. **Navigate to Purchase Orders**
   - From the Purchase page, select the **Orders** tab
   - Verify the PO list loads correctly

2. **Create PO from PR** (if following from Phase 1)
   - From the Requisitions tab, select a PR
   - Click **Convert to PO** or similar action
   - The PO creation form should pre-populate with PR data
   
   **OR Create PO Directly**:
   - Click **+ New Order** button
   - Fill in the PO creation form:
     - Vendor selection
     - PO date
     - Delivery date
     - Company code
     - Add line items:
       - Material/Item
       - Quantity
       - Unit price
       - Delivery date
       - Plant/Storage location
   - Click **Create** or **Submit**

3. **Verify PO Creation**
   - PO should appear in the orders list
   - **Note the PO number** (critical for downstream testing)
   - Verify status is "Created" or "Open"
   - Check calculated totals are correct
   - Open PO details and verify all items

4. **Release PO** (if required)
   - Select the created PO
   - Click **Release** or change status to "Released"
   - Verify status changes to "Released"

---

## Phase 3: Goods Receipt (GR) Posting

**Purpose**: Record the receipt of goods against the PO

### Steps:

1. **Navigate to Receipts**
   - From the Purchase page, select the **Receipts** tab
   - Verify the receipts list loads

2. **Create Goods Receipt**
   - Click **+ New Receipt** or **Post Goods Receipt**
   - Select the released PO number from Phase 2
   - The form should display PO items
   - For each item:
     - Verify delivered quantity (can be partial or full)
     - Confirm storage location
     - Add any notes
   - Enter GR date (defaults to today)
   - Click **Post** or **Create Receipt**

3. **Verify GR Posting**
   - Receipt should appear in receipts list
   - **Note the Material Document number**
   - Verify status is "Posted"
   - Check that inventory has been updated (optional: verify in inventory module)
   - Verify PO status changes to "Partially Received" or "Fully Received"

4. **Check Material Movement** (optional)
   - Navigate to **Inventory → Movements**
   - Verify material movement was created
   - Check movement type (e.g., 101 for GR)

---

## Phase 4: Invoice Verification and Posting

**Purpose**: Record and verify vendor invoice against PO and GR

### Steps:

1. **Navigate to PO Invoices**
   - From the Purchase page, select the **Invoices** tab
   - Verify the invoices/IR list loads

2. **Create Invoice (Invoice Receipt - IR)**
   - Click **+ New Invoice** or **Post Invoice**
   - Select the PO number with posted GR
   - Fill in invoice details:
     - Invoice number (vendor's invoice number)
     - Invoice date
     - Posting date
     - Invoice amount
   - System should match against GR quantities
   - Verify line items match PO prices
   - Review any price/quantity variances
   - Click **Post** or **Create Invoice**

3. **Verify Invoice Posting**
   - Invoice should appear in invoices list
   - **Note the Invoice Document number**
   - Verify status is "Posted"
   - Check that GL entries were created (optional: check in Finance → GL Documents)
   - Verify vendor balance increased (optional: check in vendor open items)

4. **Check for Exceptions**
   - If there are price variances, verify they're displayed
   - Check that tolerances are applied correctly
   - Verify any blocking reasons if invoice is blocked

---

## Phase 5: Vendor Payment Processing

**Purpose**: Process payment for posted invoices

### Steps:

1. **Navigate to Vendor Payments**
   - From the Purchase page, select the **Payments** tab
   - **OR** navigate directly to `/purchase?tab=payments`
   - Verify the payment interface loads

2. **Review Pending Invoices**
   - The payment screen should show invoices ready for payment
   - Filter by vendor or due date if needed
   - Verify the invoice from Phase 4 appears
   - Check payment terms and due dates

3. **Create Payment** (Manual)
   - Select invoices to pay
   - Choose payment method (Check, Bank Transfer, etc.)
   - Enter payment date
   - Verify total payment amount
   - Add reference number if required
   - Click **Process Payment** or **Create Payment**

4. **Verify Payment Posting**
   - Payment should be created
   - **Note the Payment Document number**
   - Verify invoice status changes to "Paid" or "Partially Paid"
   - Check that vendor balance decreased
   - Verify payment appears in payment history

---

## Phase 6: Payment Proposals

**Purpose**: Use automated payment proposals for efficient payment processing

### Steps:

1. **Navigate to Payment Proposals**
   - Click **Finance** from dashboard or sidebar
   - Navigate to **Payment Proposal Dashboard** or `/finance/payment-proposals`
   - Verify the dashboard loads with statistics

2. **Create New Payment Proposal**
   - Click **+ Create Proposal** or **New Payment Proposal**
   - Fill in proposal parameters:
     - Company code
     - Payment date (proposal run date)
     - Vendor filters (if applicable)
     - Due date range
     - Payment methods to include
   - Click **Generate Proposal** or **Create**

3. **Verify Proposal Generation**
   - Proposal should be created with status "Draft"
   - **Note the Proposal Number**
   - Verify the proposal appears in the list
   - Check statistics:
     - Total items
     - Total amount
     - Number of vendors

4. **Review Proposal Items**
   - Click on the created proposal to view details
   - Verify that eligible invoices are included
   - Check each item:
     - Vendor name
     - Invoice number
     - Amount
     - Payment method
   - Look for any exceptions or warnings
   - Verify invoices from Phase 4 appear (if due)

5. **Edit Proposal** (optional)
   - Remove items if needed
   - Add missing items manually
   - Adjust payment amounts if permitted
   - Save changes

6. **Approve/Process Proposal**
   - Change proposal status to "Approved" or click **Approve**
   - Verify status changes
   - Click **Execute** or **Process Payments**
   - Confirm the payment run

7. **Verify Payment Execution**
   - Proposal status should change to "Executed" or "Completed"
   - Individual items should show "Paid" or "Processed"
   - Verify payment documents were created
   - Check for any failed items with error messages

8. **Export Payment File** (optional)
   - Click **Download** or **Export** on the proposal
   - Verify payment file (e.g., CSV, XML) downloads correctly
   - Check file format contains:
     - Vendor banking details
     - Payment amounts
     - Reference numbers

---

## Phase 7: End-to-End Verification

**Purpose**: Verify complete flow integrity and data consistency

### Steps:

1. **Verify Vendor Account**
   - Navigate to vendor master data or vendor account
   - Check open items
   - Verify that paid invoices are cleared
   - Check vendor balance is accurate

2. **Verify GL Postings**
   - Navigate to **Finance → Journal Entries** or GL Documents
   - Search for documents related to:
     - PO invoice posting (GR/IR account)
     - Payment posting (vendor AP account, bank clearing)
   - Verify debit/credit entries are correct
   - Check that accounts balance

3. **Check Financial Reports**
   - Run Vendor Aging Report
   - Run Accounts Payable Report
   - Verify that figures match expected values
   - Check payment history report

4. **Audit Trail Verification**
   - Review created documents:
     - PR number
     - PO number
     - GR document
     - Invoice document
     - Payment document
     - Payment proposal
   - Verify all document links are maintained
   - Check that user and timestamp information is correct

---

## Phase 8: Exception Handling Tests

**Purpose**: Test error scenarios and edge cases

### Optional Test Scenarios:

1. **Partial GR Posting**
   - Post GR for less quantity than PO
   - Verify PO status is "Partially Received"
   - Verify only received quantity can be invoiced

2. **Price Variance**
   - Post invoice with different price than PO
   - Verify variance is calculated
   - Check if invoice is blocked for payment (if configured)

3. **Payment Proposal Exceptions**
   - Create proposal with no eligible invoices
   - Verify empty proposal or appropriate message
   - Create proposal with blocked invoices
   - Verify blocked items are flagged

4. **Duplicate Invoice Prevention**
   - Try to post same invoice number twice for same vendor
   - Verify system prevents duplicate

5. **Payment Reversal** (if supported)
   - Reverse a payment document
   - Verify invoice status changes back to "Open"
   - Verify GL postings are reversed

---

## Test Data Tracking Template

Use this template to record your test execution:

| Phase | Document Type | Document Number | Status | Notes |
|-------|---------------|-----------------|--------|-------|
| 1     | PR            |                 |        |       |
| 2     | PO            |                 |        |       |
| 3     | GR            |                 |        |       |
| 4     | Invoice       |                 |        |       |
| 5     | Payment       |                 |        |       |
| 6     | Proposal      |                 |        |       |

---

## Common Issues and Troubleshooting

### Issue: PO doesn't appear in GR selection
- **Solution**: Verify PO status is "Released"
- Check that PO has items with remaining quantity to receive

### Issue: Invoice cannot be posted
- **Solution**: Verify GR is posted first
- Check that quantities don't exceed received quantities
- Verify GL account determination is configured

### Issue: Invoice not appearing in payment run
- **Solution**: Check invoice due date
- Verify invoice is not blocked
- Check payment terms configuration
- Verify company code matches

### Issue: Payment proposal has no items
- **Solution**: Verify payment date and due date filters
- Check that invoices are posted and not already paid
- Verify vendor has valid payment method and bank details

### Issue: GL posting errors
- **Solution**: Check account determination configuration
- Verify company code GL accounts are set up
- Check posting periods are open

---

## Success Criteria

✅ PR created and visible in list  
✅ PO created from PR with correct data  
✅ GR posted and inventory updated  
✅ Invoice posted and GL entries created  
✅ Payment processed and vendor balance cleared  
✅ Payment proposal generated with eligible items  
✅ Payment proposal executed successfully  
✅ All documents are linked correctly  
✅ Financial reports show accurate data  
✅ No console errors or UI crashes

---

## Notes

- This workflow represents a full procure-to-pay cycle
- Adjust steps based on your specific business configuration
- Document any deviations or custom requirements
- Report bugs with screenshots and document numbers
- For production testing, use dedicated test company codes
