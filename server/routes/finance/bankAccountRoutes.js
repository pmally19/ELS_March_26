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
import { Router } from "express";
import { pool } from "../../db";
var router = Router();
/**
 * Get all bank accounts with balances and configurations
 */
router.get("/", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        ba.id,\n        ba.account_number,\n        ba.account_name,\n        ba.bank_name,\n        ba.account_type,\n        ba.current_balance,\n        ba.available_balance,\n        ba.currency,\n        ba.company_code_id,\n        cc.name as company_name,\n        ba.gl_account_id,\n        gl.account_name as gl_account_name,\n        ba.is_active,\n        ba.created_at\n      FROM bank_accounts ba\n      LEFT JOIN company_codes cc ON ba.company_code_id = cc.id\n      LEFT JOIN gl_accounts gl ON ba.gl_account_id = gl.id\n      WHERE ba.is_active = true\n      ORDER BY ba.account_type, ba.account_name\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("Error fetching bank accounts:", error_1);
                res.status(500).json({ error: "Failed to fetch bank accounts" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });

/**
 * Get individual bank account by ID
 */
router.get("/:id", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, result, error_1a;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = req.params.id;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, pool.query(`
      SELECT 
        ba.id,
        ba.account_number,
        ba.account_name,
        ba.bank_name,
        ba.account_type,
        ba.current_balance,
        ba.available_balance,
        ba.currency,
        ba.company_code_id,
        cc.name as company_name,
        ba.gl_account_id,
        gl.account_name as gl_account_name,
        ba.is_active,
        ba.created_at
      FROM bank_accounts ba
      LEFT JOIN company_codes cc ON ba.company_code_id = cc.id
      LEFT JOIN gl_accounts gl ON ba.gl_account_id = gl.id
      WHERE ba.id = }); });
    `, [id])];
            case 2:
                result = _a.sent();
                if (result.rows.length === 0) {
                    res.status(404).json({ error: "Bank account not found" });
                    return [2 /*return*/];
                }
                res.json(result.rows[0]);
                return [3 /*break*/, 4];
            case 3:
                error_1a = _a.sent();
                console.error("Error fetching bank account:", error_1a);
                res.status(500).json({ error: "Failed to fetch bank account" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
/**
 * Get lockbox processing data
 */
router.get("/lockbox", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        lp.id,\n        lp.lockbox_number,\n        lp.processing_date,\n        lp.deposit_amount,\n        lp.check_count,\n        lp.ach_count,\n        lp.wire_count,\n        lp.deposit_slip_number,\n        lp.bank_file_name,\n        lp.processing_status,\n        ba.account_name,\n        ba.bank_name\n      FROM lockbox_processing lp\n      JOIN bank_accounts ba ON lp.bank_account_id = ba.id\n      ORDER BY lp.processing_date DESC\n      LIMIT 50\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("Error fetching lockbox data:", error_2);
                res.status(500).json({ error: "Failed to fetch lockbox processing data" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Get lockbox transactions with cash application status
 */
router.get("/lockbox/transactions", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        lt.id,\n        lt.check_number,\n        lt.customer_account,\n        lt.payment_amount,\n        lt.payment_date,\n        lt.deposit_date,\n        lt.remittance_data,\n        lt.invoice_references,\n        lt.cash_application_status,\n        lt.exception_reason,\n        lt.manual_review_required,\n        lp.lockbox_number,\n        lp.processing_date,\n        ba.account_name,\n        ba.bank_name\n      FROM lockbox_transactions lt\n      JOIN lockbox_processing lp ON lt.lockbox_id = lp.id\n      JOIN bank_accounts ba ON lp.bank_account_id = ba.id\n      ORDER BY lt.deposit_date DESC, lt.payment_amount DESC\n      LIMIT 100\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Error fetching lockbox transactions:", error_3);
                res.status(500).json({ error: "Failed to fetch lockbox transactions" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Get EDI transactions
 */
router.get("/edi", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, pool.query("\n      SELECT \n        id,\n        edi_transaction_set,\n        sender_id,\n        receiver_id,\n        control_number,\n        transaction_date,\n        document_type,\n        reference_number,\n        total_amount,\n        currency_code,\n        processing_status,\n        error_messages,\n        parsed_data,\n        related_ar_id,\n        related_ap_id,\n        created_at,\n        processed_at\n      FROM edi_transactions\n      ORDER BY transaction_date DESC\n      LIMIT 50\n    ")];
            case 1:
                result = _a.sent();
                res.json(result.rows);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error("Error fetching EDI transactions:", error_4);
                res.status(500).json({ error: "Failed to fetch EDI transactions" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Process cash application for lockbox transactions
 */
router.post("/lockbox/apply-cash", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, transactionId, invoiceNumbers, applicationAmount, notes, _i, invoiceNumbers_1, invoiceNum, error_5;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = req.body, transactionId = _a.transactionId, invoiceNumbers = _a.invoiceNumbers, applicationAmount = _a.applicationAmount, notes = _a.notes;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 9, , 11]);
                return [4 /*yield*/, pool.query('BEGIN')];
            case 2:
                _b.sent();
                // Update lockbox transaction
                return [4 /*yield*/, pool.query("\n      UPDATE lockbox_transactions \n      SET cash_application_status = 'applied',\n          applied_at = CURRENT_TIMESTAMP,\n          ar_application_id = $2\n      WHERE id = $1\n    ", [transactionId, Math.floor(Math.random() * 1000000)])];
            case 3:
                // Update lockbox transaction
                _b.sent();
                _i = 0, invoiceNumbers_1 = invoiceNumbers;
                _b.label = 4;
            case 4:
                if (!(_i < invoiceNumbers_1.length)) return [3 /*break*/, 7];
                invoiceNum = invoiceNumbers_1[_i];
                return [4 /*yield*/, pool.query("\n        UPDATE accounts_receivable \n        SET status = 'Paid',\n            payment_date = CURRENT_DATE,\n            payment_amount = payment_amount + $2\n        WHERE invoice_number = $1\n      ", [invoiceNum, applicationAmount / invoiceNumbers.length])];
            case 5:
                _b.sent();
                _b.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7: return [4 /*yield*/, pool.query('COMMIT')];
            case 8:
                _b.sent();
                res.json({ success: true, message: 'Cash application processed successfully' });
                return [3 /*break*/, 11];
            case 9:
                error_5 = _b.sent();
                return [4 /*yield*/, pool.query('ROLLBACK')];
            case 10:
                _b.sent();
                console.error("Error processing cash application:", error_5);
                res.status(500).json({ error: "Failed to process cash application" });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
export default router;
