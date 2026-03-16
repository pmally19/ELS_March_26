var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { Router } from 'express';
import { pool } from '../../db.js';
var router = Router();
// ===================================
// VENDOR MASTER MANAGEMENT (Functions 1-12)
// ===================================
// Function 1-2: Enhanced Vendor Master & Corporate Groups
router.get('/vendor-master/enhanced', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        evm.*,\n        vcg.group_name as corporate_group_name,\n        vag.group_name as authorization_group_name,\n        ev.name as vendor_name,\n        ev.vendor_code\n      FROM enhanced_vendor_master evm\n      LEFT JOIN vendor_corporate_groups vcg ON evm.corporate_group_id = vcg.id\n      LEFT JOIN vendor_authorization_groups vag ON evm.authorization_group = vag.group_code\n      LEFT JOIN erp_vendors ev ON evm.vendor_id = ev.id\n      WHERE evm.is_active = true\n      ORDER BY evm.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error('Error fetching enhanced vendor master:', error_1);
                res.status(500).json({ error: 'Failed to fetch enhanced vendor master data' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/vendor-master/enhanced', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendor_id, corporate_group_id, authorization_group, industry_key, tax_office, vat_registration, withholding_tax_country, withholding_tax_type, withholding_tax_code, withholding_liable, exemption_number, exemption_percentage, exemption_reason, exemption_from, exemption_to, head_office_account, alternative_payee, cash_management_group, result, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, vendor_id = _a.vendor_id, corporate_group_id = _a.corporate_group_id, authorization_group = _a.authorization_group, industry_key = _a.industry_key, tax_office = _a.tax_office, vat_registration = _a.vat_registration, withholding_tax_country = _a.withholding_tax_country, withholding_tax_type = _a.withholding_tax_type, withholding_tax_code = _a.withholding_tax_code, withholding_liable = _a.withholding_liable, exemption_number = _a.exemption_number, exemption_percentage = _a.exemption_percentage, exemption_reason = _a.exemption_reason, exemption_from = _a.exemption_from, exemption_to = _a.exemption_to, head_office_account = _a.head_office_account, alternative_payee = _a.alternative_payee, cash_management_group = _a.cash_management_group;
                return [4 /*yield*/, pool.query("\n      INSERT INTO enhanced_vendor_master (\n        vendor_id, corporate_group_id, authorization_group, industry_key,\n        tax_office, vat_registration, withholding_tax_country, withholding_tax_type,\n        withholding_tax_code, withholding_liable, exemption_number, exemption_percentage,\n        exemption_reason, exemption_from, exemption_to, head_office_account,\n        alternative_payee, cash_management_group, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'user')\n      RETURNING *\n    ", [
                        vendor_id, corporate_group_id, authorization_group, industry_key,
                        tax_office, vat_registration, withholding_tax_country, withholding_tax_type,
                        withholding_tax_code, withholding_liable, exemption_number, exemption_percentage,
                        exemption_reason, exemption_from, exemption_to, head_office_account,
                        alternative_payee, cash_management_group
                    ])];
            case 1:
                result = _b.sent();
                res.json(result.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _b.sent();
                console.error('Error creating enhanced vendor master:', error_2);
                res.status(500).json({ error: 'Failed to create enhanced vendor master' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Function 3-4: Corporate Groups Management
router.get('/vendor-master/corporate-groups', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT * FROM vendor_corporate_groups \n      WHERE is_active = true \n      ORDER BY group_name\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error('Error fetching corporate groups:', error_3);
                res.status(500).json({ error: 'Failed to fetch corporate groups' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Function 9-12: Master Data Statistics
router.get('/vendor-master/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM enhanced_vendor_master WHERE is_active = true) as enhanced_vendors,\n        (SELECT COUNT(*) FROM vendor_corporate_groups WHERE is_active = true) as corporate_groups,\n        (SELECT COUNT(*) FROM vendor_authorization_groups WHERE is_active = true) as authorization_groups,\n        (SELECT COUNT(*) FROM vendor_banking_details WHERE is_active = true) as banking_details,\n        (SELECT COUNT(*) FROM enhanced_vendor_master WHERE withholding_liable = true AND is_active = true) as withholding_tax_vendors,\n        (SELECT COUNT(*) FROM enhanced_vendor_master WHERE exemption_number IS NOT NULL AND is_active = true) as tax_exempt_vendors\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error('Error fetching vendor master statistics:', error_4);
                res.status(500).json({ error: 'Failed to fetch vendor master statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===================================
// INVOICE VERIFICATION (Functions 13-18)
// ===================================
router.get('/invoice-verification/workflows', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        ivw.*,\n        ev.name as vendor_name,\n        ev.vendor_code,\n        COALESCE(line_count.count, 0) as line_items\n      FROM invoice_verification_workflow ivw\n      LEFT JOIN erp_vendors ev ON ivw.vendor_id = ev.id\n      LEFT JOIN (\n        SELECT verification_id, COUNT(*) as count \n        FROM invoice_line_validation \n        WHERE is_active = true \n        GROUP BY verification_id\n      ) line_count ON ivw.id = line_count.verification_id\n      WHERE ivw.is_active = true\n      ORDER BY ivw.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error('Error fetching invoice verification workflows:', error_5);
                res.status(500).json({ error: 'Failed to fetch invoice verification workflows' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/invoice-verification/workflows', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, workflow_stage, verification_type, po_number, gr_number, invoice_number, vendor_id, invoice_amount, assigned_to, verification_notes, result, error_6;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, workflow_stage = _a.workflow_stage, verification_type = _a.verification_type, po_number = _a.po_number, gr_number = _a.gr_number, invoice_number = _a.invoice_number, vendor_id = _a.vendor_id, invoice_amount = _a.invoice_amount, assigned_to = _a.assigned_to, verification_notes = _a.verification_notes;
                return [4 /*yield*/, pool.query("\n      INSERT INTO invoice_verification_workflow (\n        workflow_stage, verification_type, po_number, gr_number, invoice_number,\n        vendor_id, invoice_amount, assigned_to, verification_notes, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'user')\n      RETURNING *\n    ", [workflow_stage, verification_type, po_number, gr_number, invoice_number, vendor_id, invoice_amount, assigned_to, verification_notes])];
            case 1:
                result = _b.sent();
                res.json(result.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_6 = _b.sent();
                console.error('Error creating invoice verification workflow:', error_6);
                res.status(500).json({ error: 'Failed to create invoice verification workflow' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/invoice-verification/line-items/:verification_id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var verification_id, result, error_7;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                verification_id = req.params.verification_id;
                return [4 /*yield*/, pool.query("\n      SELECT * FROM invoice_line_validation \n      WHERE verification_id = $1 AND is_active = true \n      ORDER BY line_number\n    ", [verification_id])];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_7 = _a.sent();
                console.error('Error fetching line item validation:', error_7);
                res.status(500).json({ error: 'Failed to fetch line item validation' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/invoice-verification/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_8;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM invoice_verification_workflow WHERE is_active = true) as total_workflows,\n        (SELECT COUNT(*) FROM invoice_verification_workflow WHERE verification_status = 'PENDING' AND is_active = true) as pending_verification,\n        (SELECT COUNT(*) FROM invoice_verification_workflow WHERE verification_status = 'APPROVED' AND is_active = true) as approved_invoices,\n        (SELECT COUNT(*) FROM invoice_verification_workflow WHERE verification_status = 'REJECTED' AND is_active = true) as rejected_invoices,\n        (SELECT COUNT(*) FROM invoice_verification_workflow WHERE tolerance_exceeded = true AND is_active = true) as tolerance_exceeded,\n        (SELECT COALESCE(AVG(invoice_amount), 0) FROM invoice_verification_workflow WHERE is_active = true) as avg_invoice_amount,\n        (SELECT COUNT(*) FROM invoice_line_validation WHERE validation_status = 'VARIANCE' AND is_active = true) as line_variances\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_8 = _a.sent();
                console.error('Error fetching verification statistics:', error_8);
                res.status(500).json({ error: 'Failed to fetch verification statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===================================
// PAYMENT PROCESSING (Functions 19-26)
// ===================================
router.get('/payment-processing/requests', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_9;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        ppc.*,\n        ev.name as vendor_name,\n        ev.vendor_code,\n        pmc.method_name\n      FROM payment_processing_center ppc\n      LEFT JOIN erp_vendors ev ON ppc.vendor_id = ev.id\n      LEFT JOIN payment_method_config pmc ON ppc.payment_method = pmc.method_code\n      WHERE ppc.is_active = true\n      ORDER BY ppc.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_9 = _a.sent();
                console.error('Error fetching payment requests:', error_9);
                res.status(500).json({ error: 'Failed to fetch payment requests' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/payment-processing/requests', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, payment_request_id, vendor_id, payment_method, payment_type, payment_amount, currency_code, house_bank, payment_date, due_date, payment_terms, payment_reference, processing_notes, result, error_10;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, payment_request_id = _a.payment_request_id, vendor_id = _a.vendor_id, payment_method = _a.payment_method, payment_type = _a.payment_type, payment_amount = _a.payment_amount, currency_code = _a.currency_code, house_bank = _a.house_bank, payment_date = _a.payment_date, due_date = _a.due_date, payment_terms = _a.payment_terms, payment_reference = _a.payment_reference, processing_notes = _a.processing_notes;
                return [4 /*yield*/, pool.query("\n      INSERT INTO payment_processing_center (\n        payment_request_id, vendor_id, payment_method, payment_type,\n        payment_amount, currency_code, house_bank, payment_date, due_date,\n        payment_terms, payment_reference, processing_notes, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'user')\n      RETURNING *\n    ", [
                        payment_request_id, vendor_id, payment_method, payment_type,
                        payment_amount, currency_code, house_bank, payment_date, due_date,
                        payment_terms, payment_reference, processing_notes
                    ])];
            case 1:
                result = _b.sent();
                res.json(result.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_10 = _b.sent();
                console.error('Error creating payment request:', error_10);
                res.status(500).json({ error: 'Failed to create payment request' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/payment-processing/methods', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_11;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT * FROM payment_method_config \n      WHERE is_active = true \n      ORDER BY method_name\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_11 = _a.sent();
                console.error('Error fetching payment methods:', error_11);
                res.status(500).json({ error: 'Failed to fetch payment methods' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/payment-processing/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_12;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM payment_processing_center WHERE is_active = true) as total_payments,\n        (SELECT COUNT(*) FROM payment_processing_center WHERE payment_status = 'PENDING' AND is_active = true) as pending_payments,\n        (SELECT COUNT(*) FROM payment_processing_center WHERE payment_status = 'APPROVED' AND is_active = true) as approved_payments,\n        (SELECT COUNT(*) FROM payment_processing_center WHERE payment_status = 'PROCESSED' AND is_active = true) as processed_payments,\n        (SELECT COALESCE(SUM(payment_amount), 0) FROM payment_processing_center WHERE payment_status = 'PROCESSED' AND is_active = true) as total_processed_amount,\n        (SELECT COUNT(*) FROM payment_method_config WHERE is_active = true) as active_payment_methods,\n        (SELECT COUNT(*) FROM payment_processing_center WHERE payment_block_reason IS NOT NULL AND is_active = true) as blocked_payments\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_12 = _a.sent();
                console.error('Error fetching payment statistics:', error_12);
                res.status(500).json({ error: 'Failed to fetch payment statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===================================
// DOCUMENT PARKING (Functions 23-26)
// ===================================
router.get('/document-parking/documents', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_13;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        dp.*,\n        ev.name as vendor_name,\n        ev.vendor_code\n      FROM ap_document_parking dp\n      LEFT JOIN erp_vendors ev ON dp.vendor_id = ev.id\n      WHERE dp.active = true\n      ORDER BY dp.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_13 = _a.sent();
                console.error('Error fetching parked documents:', error_13);
                res.status(500).json({ error: 'Failed to fetch parked documents' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/document-parking/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_14;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM ap_document_parking WHERE active = true) as parked_documents,\n        (SELECT COUNT(*) FROM ap_document_parking WHERE status = 'PARKED' AND active = true) as pending_documents,\n        (SELECT COUNT(*) FROM ap_document_parking WHERE status = 'POSTED' AND active = true) as posted_documents,\n        (SELECT COALESCE(SUM(amount), 0) FROM ap_document_parking WHERE active = true) as total_amount,\n        (SELECT COUNT(*) FROM ap_document_parking WHERE incomplete_reason IS NOT NULL AND active = true) as incomplete_documents,\n        (SELECT COUNT(DISTINCT vendor_id) FROM ap_document_parking WHERE active = true) as vendors_with_parked_docs,\n        (SELECT COUNT(*) FROM ap_document_parking WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND active = true) as recent_documents\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_14 = _a.sent();
                console.error('Error fetching document parking statistics:', error_14);
                res.status(500).json({ error: 'Failed to fetch document parking statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/document-parking/park', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendor_id, document_type, document_date, posting_date, company_code, currency, invoice_date, reference, document_amount, calculate_tax, payment_terms, baseline_date, document_header_text, special_gl_indicator, parked_by, incomplete_reason, line_items, documentNumber, result, error_15;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, vendor_id = _a.vendor_id, document_type = _a.document_type, document_date = _a.document_date, posting_date = _a.posting_date, company_code = _a.company_code, currency = _a.currency, invoice_date = _a.invoice_date, reference = _a.reference, document_amount = _a.document_amount, calculate_tax = _a.calculate_tax, payment_terms = _a.payment_terms, baseline_date = _a.baseline_date, document_header_text = _a.document_header_text, special_gl_indicator = _a.special_gl_indicator, parked_by = _a.parked_by, incomplete_reason = _a.incomplete_reason, line_items = _a.line_items;
                documentNumber = "PKD".concat(Date.now());
                return [4 /*yield*/, pool.query("\n      INSERT INTO ap_document_parking (\n        document_number, vendor_id, document_type, document_date, posting_date,\n        company_code, currency, invoice_date, reference, document_amount, calculate_tax,\n        payment_terms, baseline_date, document_header_text, special_gl_indicator,\n        parked_by, incomplete_reason\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)\n      RETURNING id\n    ", [
                        documentNumber, vendor_id, document_type, document_date, posting_date,
                        company_code, currency, invoice_date, reference, document_amount, calculate_tax,
                        payment_terms, baseline_date, document_header_text, special_gl_indicator,
                        parked_by, incomplete_reason
                    ])];
            case 1:
                result = _b.sent();
                res.json({
                    success: true,
                    document_number: documentNumber,
                    parking_document_id: result.rows[0].id,
                    message: "Document parked successfully"
                });
                return [3 /*break*/, 3];
            case 2:
                error_15 = _b.sent();
                console.error('Error parking document:', error_15);
                res.status(500).json({ error: 'Failed to park document' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===================================
// CLEARING & SETTLEMENT (Functions 27-31)
// ===================================
router.get('/clearing-settlement/hubs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_16;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        csh.*,\n        ev.name as vendor_name,\n        ev.vendor_code\n      FROM clearing_settlement_hub csh\n      LEFT JOIN erp_vendors ev ON csh.vendor_id = ev.id\n      WHERE csh.is_active = true\n      ORDER BY csh.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_16 = _a.sent();
                console.error('Error fetching clearing settlement hubs:', error_16);
                res.status(500).json({ error: 'Failed to fetch clearing settlement hubs' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/clearing-settlement/hubs', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, clearing_id, vendor_id, clearing_type, clearing_method, total_debit_amount, total_credit_amount, clearing_date, clearing_document, processing_notes, clearing_difference, result, error_17;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, clearing_id = _a.clearing_id, vendor_id = _a.vendor_id, clearing_type = _a.clearing_type, clearing_method = _a.clearing_method, total_debit_amount = _a.total_debit_amount, total_credit_amount = _a.total_credit_amount, clearing_date = _a.clearing_date, clearing_document = _a.clearing_document, processing_notes = _a.processing_notes;
                clearing_difference = total_debit_amount - total_credit_amount;
                return [4 /*yield*/, pool.query("\n      INSERT INTO clearing_settlement_hub (\n        clearing_id, vendor_id, clearing_type, clearing_method,\n        total_debit_amount, total_credit_amount, clearing_difference,\n        clearing_date, clearing_document, processing_notes, created_by\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'user')\n      RETURNING *\n    ", [
                        clearing_id, vendor_id, clearing_type, clearing_method,
                        total_debit_amount, total_credit_amount, clearing_difference,
                        clearing_date, clearing_document, processing_notes
                    ])];
            case 1:
                result = _b.sent();
                res.json(result.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_17 = _b.sent();
                console.error('Error creating clearing settlement hub:', error_17);
                res.status(500).json({ error: 'Failed to create clearing settlement hub' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/clearing-settlement/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_18;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM clearing_settlement_hub WHERE is_active = true) as total_clearing_hubs,\n        (SELECT COUNT(*) FROM clearing_settlement_hub WHERE clearing_status = 'PENDING' AND is_active = true) as pending_clearings,\n        (SELECT COUNT(*) FROM clearing_settlement_hub WHERE clearing_status = 'COMPLETED' AND is_active = true) as completed_clearings,\n        (SELECT COALESCE(SUM(ABS(clearing_difference)), 0) FROM clearing_settlement_hub WHERE is_active = true) as total_differences,\n        (SELECT COUNT(*) FROM clearing_line_items WHERE clearing_status = 'OPEN' AND is_active = true) as open_line_items,\n        (SELECT COUNT(*) FROM clearing_line_items WHERE clearing_status = 'CLEARED' AND is_active = true) as cleared_line_items,\n        (SELECT COALESCE(AVG(items_cleared), 0) FROM clearing_settlement_hub WHERE is_active = true) as avg_items_per_clearing\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_18 = _a.sent();
                console.error('Error fetching clearing statistics:', error_18);
                res.status(500).json({ error: 'Failed to fetch clearing statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ===================================
// DOWN PAYMENT MANAGEMENT (Functions 27-31)
// ===================================
router.get('/down-payment/requests', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_19;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        dp.*,\n        ev.name as vendor_name,\n        ev.vendor_code\n      FROM ap_down_payments dp\n      LEFT JOIN erp_vendors ev ON dp.vendor_id = ev.id\n      WHERE dp.active = true\n      ORDER BY dp.created_at DESC\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_19 = _a.sent();
                console.error('Error fetching down payment requests:', error_19);
                res.status(500).json({ error: 'Failed to fetch down payment requests' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.post('/down-payment/requests', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, vendor_id, down_payment_amount, request_date, target_special_gl_indicator, due_date, tax_code, payment_date, bank_account, status_1, result, error_20;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, vendor_id = _a.vendor_id, down_payment_amount = _a.down_payment_amount, request_date = _a.request_date, target_special_gl_indicator = _a.target_special_gl_indicator, due_date = _a.due_date, tax_code = _a.tax_code, payment_date = _a.payment_date, bank_account = _a.bank_account, status_1 = _a.status;
                return [4 /*yield*/, pool.query("\n      INSERT INTO ap_down_payments (\n        vendor_id, down_payment_amount, request_date, target_special_gl_indicator,\n        due_date, tax_code, payment_date, bank_account, status\n      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)\n      RETURNING *\n    ", [
                        vendor_id, down_payment_amount, request_date, target_special_gl_indicator,
                        due_date, tax_code, payment_date, bank_account, status_1 || 'REQUESTED'
                    ])];
            case 1:
                result = _b.sent();
                res.json(result.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_20 = _b.sent();
                console.error('Error creating down payment request:', error_20);
                res.status(500).json({ error: 'Failed to create down payment request' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
router.get('/down-payment/statistics', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stats, error_21;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        (SELECT COUNT(*) FROM ap_down_payments WHERE active = true) as total_down_payments,\n        (SELECT COUNT(*) FROM ap_down_payments WHERE status = 'REQUESTED' AND active = true) as pending_down_payments,\n        (SELECT COUNT(*) FROM ap_down_payments WHERE status = 'APPROVED' AND active = true) as approved_down_payments,\n        (SELECT COUNT(*) FROM ap_down_payments WHERE status = 'PAID' AND active = true) as paid_down_payments,\n        (SELECT COALESCE(SUM(down_payment_amount), 0) FROM ap_down_payments WHERE status = 'PAID' AND active = true) as total_paid_amount,\n        (SELECT COUNT(DISTINCT vendor_id) FROM ap_down_payments WHERE active = true) as vendors_with_down_payments,\n        (SELECT AVG(down_payment_amount) FROM ap_down_payments WHERE down_payment_amount IS NOT NULL AND active = true) as avg_down_payment_amount\n    ")];
            case 1:
                stats = _a.sent();
                res.json(stats.rows[0]);
                return [3 /*break*/, 3];
            case 2:
                error_21 = _a.sent();
                console.error('Error fetching down payment statistics:', error_21);
                res.status(500).json({ error: 'Failed to fetch down payment statistics' });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
export default router;
