"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPartnerDocuments = void 0;
const db_1 = __importDefault(require("../db"));
/**
 * Handles bulk uploading and metadata mapping for delivery/transport partner documents.
 * Integrates database transactions to guarantee atomic execution.
 */
const uploadPartnerDocuments = async (req, res) => {
    const { partner_id, partner_type } = req.body;
    if (!partner_id || !partner_type) {
        return res.status(400).json({ success: false, message: "Missing partner_id or partner_type parameters." });
    }
    const files = req.files;
    if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({ success: false, message: "No document files were uploaded." });
    }
    const insertedDocs = [];
    // Fields to extract from form-data and map to database types
    const docFields = [
        { field: "profile", type: "Profile" },
        { field: "aadhaar", type: "Aadhaar" },
        { field: "dl", type: "DL" },
        { field: "rc", type: "RC" },
    ];
    db_1.default.getConnection((err, conn) => {
        if (err) {
            console.error("❌ DB Connection Error in uploadPartnerDocuments:", err);
            return res.status(500).json({ success: false, message: "Database connection failed" });
        }
        conn.beginTransaction((txErr) => {
            if (txErr) {
                conn.release();
                console.error("❌ Transaction Begin Error in uploadPartnerDocuments:", txErr);
                return res.status(500).json({ success: false, message: "Failed to initialize database transaction" });
            }
            const insertSql = "INSERT INTO partner_documents (partner_type, partner_id, document_type, document_url, status) VALUES (?, ?, ?, ?, 'PENDING')";
            let insertIndex = 0;
            const executeInserts = () => {
                while (insertIndex < docFields.length) {
                    const item = docFields[insertIndex];
                    const fileArr = files[item.field];
                    if (fileArr && fileArr.length > 0) {
                        const file = fileArr[0];
                        const docUrl = file.filename.startsWith("http") ? file.filename : `/uploads/${file.filename}`;
                        conn.query(insertSql, [partner_type, Number(partner_id), item.type, docUrl], (insErr) => {
                            if (insErr) {
                                return conn.rollback(() => {
                                    conn.release();
                                    console.error("❌ DB Error writing partner document metadata:", insErr);
                                    return res.status(500).json({
                                        success: false,
                                        message: "Database insertion failed",
                                        error: insErr.message || String(insErr),
                                    });
                                });
                            }
                            insertedDocs.push({ type: item.type, url: docUrl });
                            insertIndex++;
                            executeInserts();
                        });
                        return;
                    }
                    insertIndex++;
                }
                conn.commit((commitErr) => {
                    if (commitErr) {
                        return conn.rollback(() => {
                            conn.release();
                            console.error("❌ Transaction Commit Error in uploadPartnerDocuments:", commitErr);
                            return res.status(500).json({ success: false, message: "Transaction commit failure" });
                        });
                    }
                    conn.release();
                    console.log(`✅ ${insertedDocs.length} partner documents metadata saved successfully for partner #${partner_id} (${partner_type})`);
                    return res.status(200).json({
                        success: true,
                        message: "Documents saved successfully!",
                        data: insertedDocs,
                    });
                });
            };
            executeInserts();
        });
    });
};
exports.uploadPartnerDocuments = uploadPartnerDocuments;
