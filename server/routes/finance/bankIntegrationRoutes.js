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
import { bankIntegrationService } from "../../services/bankIntegrationService";
import multer from "multer";
var router = Router();
var upload = multer({ dest: 'uploads/' });
/**
 * Configure real bank account connection
 */
router.post("/configure-bank", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var config, result, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                config = req.body;
                // Validate required fields
                if (!config.bankName || !config.routingNumber || !config.accountNumber) {
                    return [2 /*return*/, res.status(400).json({ error: "Missing required bank configuration" })];
                }
                return [4 /*yield*/, bankIntegrationService.configureBankAccount(config)];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("Bank configuration error:", error_1);
                res.status(500).json({ error: "Failed to configure bank account" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Configure EDI trading partner
 */
router.post("/configure-edi", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var config, result, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                config = req.body;
                // Validate required fields
                if (!config.partnerName || !config.partnerISA || !config.ourISA) {
                    return [2 /*return*/, res.status(400).json({ error: "Missing required EDI configuration" })];
                }
                return [4 /*yield*/, bankIntegrationService.configureEDIPartner(config)];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_2 = _a.sent();
                console.error("EDI configuration error:", error_2);
                res.status(500).json({ error: "Failed to configure EDI partner" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Upload and process bank statement file
 */
router.post("/upload-statement/:bankAccountId", upload.single('statement'), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var fs, fileContent, result, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                if (!req.file) {
                    return [2 /*return*/, res.status(400).json({ error: "No statement file uploaded" })];
                }
                fs = require('fs');
                fileContent = fs.readFileSync(req.file.path, 'utf8');
                return [4 /*yield*/, bankIntegrationService.processBankStatement({
                        bankAccountId: parseInt(req.params.bankAccountId),
                        fileName: req.file.originalname,
                        fileContent: fileContent,
                        statementDate: req.body.statementDate || new Date().toISOString().split('T')[0]
                    })];
            case 1:
                result = _a.sent();
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Bank statement processing error:", error_3);
                res.status(500).json({ error: "Failed to process bank statement" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Send EDI document to trading partner
 */
router.post("/send-edi", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var document_1, result, error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                document_1 = req.body;
                if (!document_1.tradingPartnerId || !document_1.documentType) {
                    return [2 /*return*/, res.status(400).json({ error: "Missing required EDI document fields" })];
                }
                return [4 /*yield*/, bankIntegrationService.sendEDIDocument(document_1)];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_4 = _a.sent();
                console.error("EDI transmission error:", error_4);
                res.status(500).json({ error: "Failed to send EDI document" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Get real-time bank balance
 */
router.get("/balance/:bankAccountId", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var bankAccountId, result, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                bankAccountId = parseInt(req.params.bankAccountId);
                return [4 /*yield*/, bankIntegrationService.getBankBalance(bankAccountId)];
            case 1:
                result = _a.sent();
                res.json(result);
                return [3 /*break*/, 3];
            case 2:
                error_5 = _a.sent();
                console.error("Bank balance inquiry error:", error_5);
                res.status(500).json({ error: "Failed to retrieve bank balance" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
/**
 * Test bank API connection
 */
router.post("/test-connection/:bankAccountId", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var bankAccountId, result, error_6;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                bankAccountId = parseInt(req.params.bankAccountId);
                return [4 /*yield*/, bankIntegrationService.getBankBalance(bankAccountId)];
            case 1:
                result = _a.sent();
                res.json({
                    success: true,
                    message: "Bank API connection successful",
                    connectionTest: true,
                    timestamp: new Date()
                });
                return [3 /*break*/, 3];
            case 2:
                error_6 = _a.sent();
                console.error("Bank connection test error:", error_6);
                res.status(500).json({
                    success: false,
                    error: "Bank API connection failed",
                    details: error_6.message
                });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
export default router;
