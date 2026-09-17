import cron from "node-cron";
import db from "../db";
import { sendPartnerDueWarningMail, sendPartnerSuspensionMail } from "../utils/mailer";

// Background routine executes 2-stage commission enforcement automatically every 15 minutes
export const processCommissionEnforcement = async () => {
  console.log("⏳ [Cron] Running 2-Stage automated partner due check (Every 15 minutes)...");

  const tables = ["delivery_partners", "transport_partners"] as const;

  for (const table of tables) {
    try {
      const partnerType = table === "delivery_partners" ? "delivery" : "transport";

      // ==================================================
      // STAGE 1: 1-HOUR WARNING EMAILS
      // ==================================================
      const warningQuery = `
        SELECT id, name, email, pending_commission 
        FROM \`${table}\`
        WHERE account_status = 'APPROVED'
          AND pending_commission > 0
          AND commission_warning_sent = 0
          AND commission_deadline > NOW()
          AND commission_deadline <= DATE_ADD(NOW(), INTERVAL 1 HOUR)
      `;

      db.query(warningQuery, (err: any, rows: any[]) => {
        if (err) {
          console.error(`❌ [Cron] Stage 1 Warning select failed for ${table}:`, err.message);
          return;
        }

        if (rows && rows.length > 0) {
          const ids = rows.map((r) => r.id);
          db.query(`UPDATE \`${table}\` SET commission_warning_sent = 1 WHERE id IN (?)`, [ids], (updateErr: any) => {
            if (updateErr) {
              console.error(`❌ [Cron] Stage 1 warning update failed for ${table}:`, updateErr.message);
            } else {
              console.log(`✉️ [Cron] Stage 1 Warning sent to ${ids.length} ${partnerType} partners`);
              rows.forEach((partner) => {
                if (partner.email) {
                  sendPartnerDueWarningMail(
                    partner.email,
                    partner.name || "Partner",
                    parseFloat(partner.pending_commission || 0),
                    partner.id,
                    partnerType
                  );
                }
              });
            }
          });
        }
      });

      // ==================================================
      // STAGE 2: LOCKOUT & SUSPENSION EMAILS
      // ==================================================
      const blockingQuery = `
        SELECT id, name, email, pending_commission 
        FROM \`${table}\`
        WHERE pending_commission > 0
          AND commission_deadline <= NOW()
          AND account_status != 'BLOCKED'
      `;

      db.query(blockingQuery, (err: any, rows: any[]) => {
        if (err) {
          console.error(`❌ [Cron] Stage 2 Lockout select failed for ${table}:`, err.message);
          return;
        }

        if (rows && rows.length > 0) {
          const ids = rows.map((r) => r.id);
          const blockUpdateQuery = `
            UPDATE \`${table}\`
            SET account_status = 'BLOCKED',
                blocking_reason = 'Reason: Unpaid commission dues exceeded 24 hours'
            WHERE id IN (?)
          `;

          db.query(blockUpdateQuery, [ids], (updateErr: any) => {
            if (updateErr) {
              console.error(`❌ [Cron] Stage 2 lockout update failed for ${table}:`, updateErr.message);
            } else {
              console.log(`🔒 [Cron] Stage 2 Lockout & Email executed for ${ids.length} ${partnerType} partners`);
              rows.forEach((partner) => {
                if (partner.email) {
                  sendPartnerSuspensionMail(
                    partner.email,
                    partner.name || "Partner",
                    parseFloat(partner.pending_commission || 0),
                    partner.id,
                    partnerType
                  );
                }
              });
            }
          });
        }
      });
    } catch (tableErr: any) {
      console.error(`❌ [Cron] Error running due checking routines for ${table}:`, tableErr.message);
    }
  }
};

// Schedule automated cron task every 15 minutes
cron.schedule("*/15 * * * *", () => {
  processCommissionEnforcement();
});

// Utility Trigger: Call this function whenever a partner completes a cash-on-delivery (COD) order
export const triggerCommissionWindow = (partnerId: number, partnerRole: 'transport' | 'delivery', commissionOwed: number) => {
  const tableTarget = partnerRole === 'transport' ? 'transport_partners' : 'delivery_partners';
  
  // Set the structural deadline boundary based on configurable env threshold
  const thresholdHours = Number(process.env.COMMISSION_DEADLINE_HOURS) || 24;
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + thresholdHours);

  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error(`❌ DB Connection Error in triggerCommissionWindow for ${partnerRole} partner #${partnerId}:`, connErr.message);
      return;
    }

    conn.beginTransaction((txErr) => {
      if (txErr) {
        conn.release();
        console.error(`❌ Transaction Begin Error in triggerCommissionWindow for ${partnerRole} partner #${partnerId}:`, txErr.message);
        return;
      }

      // 1. FORCE FRESH LIVE READ-BEFORE-WRITE: SELECT ... FOR UPDATE locks the row and bypasses cache
      const selectSql = `
        SELECT pending_commission, wallet_balance, commission_deadline, commission_due_since 
        FROM ${tableTarget} 
        WHERE id = ? 
        FOR UPDATE
      `;

      conn.query(selectSql, [partnerId], (selectErr: any, rows: any[]) => {
        if (selectErr || !rows || rows.length === 0) {
          return conn.rollback(() => {
            conn.release();
            console.error(`❌ Failed to fetch and lock partner metrics for ${partnerRole} partner #${partnerId}:`, selectErr?.message || "Partner not found");
          });
        }

        const databaseResult = rows[0];

        // 2. CORRECT MATH CALCULATION INJECTION:
        // Live Dues + New Order Commission
        const freshLiveDues = parseFloat(databaseResult.pending_commission || 0);
        const updatedPendingCommission = freshLiveDues + commissionOwed;

        // Recalculate wallet balance using the freshly retrieved balance
        const freshWalletBalance = parseFloat(databaseResult.wallet_balance || 0);
        const updatedWalletBalance = freshWalletBalance - commissionOwed;

        // 3. PRESERVE ALL OTHER METRICS: Keep other fields untouched
        const updateSql = `
          UPDATE ${tableTarget} 
          SET pending_commission = ?,
              wallet_balance = ?,
              commission_deadline = COALESCE(commission_deadline, ?),
              commission_due_since = COALESCE(commission_due_since, NOW())
          WHERE id = ?
        `;

        conn.query(updateSql, [updatedPendingCommission, updatedWalletBalance, deadline, partnerId], (updateErr: any) => {
          if (updateErr) {
            return conn.rollback(() => {
              conn.release();
              console.error(`❌ Failed to update commission window for ${partnerRole} partner #${partnerId}:`, updateErr.message);
            });
          }

          conn.commit((commitErr) => {
            if (commitErr) {
              return conn.rollback(() => {
                conn.release();
                console.error(`❌ Transaction Commit Error in triggerCommissionWindow for ${partnerRole} partner #${partnerId}:`, commitErr.message);
              });
            }

            conn.release();
            console.log(`✅ Successfully updated platform commission balance for ${partnerRole} partner #${partnerId}. Dues: ${updatedPendingCommission}, Wallet: ${updatedWalletBalance}`);
          });
        });
      });
    });
  });
};

