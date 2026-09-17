"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValueTable = void 0;
const KeyValueTable = (rows) => {
    const rowHtml = rows.map(row => `
    <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; font-weight: 600; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 35%;" class="text-muted">
            ${row.key}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: right; font-weight: 500;" class="text-dark">
            ${row.value}
        </td>
    </tr>
    `).join('');
    return `
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 16px 0;">
        ${rowHtml}
    </table>
    `;
};
exports.KeyValueTable = KeyValueTable;
