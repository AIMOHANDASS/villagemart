import db from "../db";

/**
 * Checks if the order is COD and assigned to a delivery partner.
 * If so, creates a COD collection record.
 */
export const processCodCollectionIfApplicable = (orderId: string | number) => {
  const query = `
    SELECT id, payment_method, delivery_partner_id, \`total amount\` AS total_amount, delivery_fee, status, delivery_status 
    FROM orders 
    WHERE id = ? 
    LIMIT 1
  `;
  
  db.query(query, [orderId], (err: any, rows: any[]) => {
    if (err) {
      console.error(`❌ [COD] Error fetching order ${orderId} for COD collection:`, err);
      return;
    }
    
    if (rows.length === 0) return;
    
    const order = rows[0];
    
    // Ensure order is actually delivered and uses COD
    if (String(order.payment_method).toLowerCase() !== "cod") return;
    if (!order.delivery_partner_id) return;
    if (order.status !== "DELIVERED" && order.delivery_status !== "DELIVERED") return;
    
    const customerCashCollected = Number(order.total_amount) || 0;
    const deliveryCharge = Number(order.delivery_fee) || 0;
    const partnerEarning = deliveryCharge;
    const settlementPayable = customerCashCollected - partnerEarning;
    const codAmount = settlementPayable; // VillageSmart amount
    
    const insertSql = `
      INSERT INTO delivery_partner_cod_collections 
      (order_id, partner_id, cod_amount, collected_amount, customer_cash_collected, delivery_charge, partner_earning, settlement_payable, collection_status, settlement_status, collected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'COLLECTED', 'PENDING', NOW())
      ON DUPLICATE KEY UPDATE 
        cod_amount = VALUES(cod_amount),
        collected_amount = VALUES(collected_amount),
        customer_cash_collected = VALUES(customer_cash_collected),
        delivery_charge = VALUES(delivery_charge),
        partner_earning = VALUES(partner_earning),
        settlement_payable = VALUES(settlement_payable),
        collection_status = VALUES(collection_status),
        partner_id = VALUES(partner_id)
    `;
    
    const params = [
      order.id, 
      order.delivery_partner_id, 
      codAmount, 
      codAmount,
      customerCashCollected,
      deliveryCharge,
      partnerEarning,
      settlementPayable
    ];

    db.query(insertSql, params, (insertErr: any) => {
      if (insertErr) {
        console.error(`❌ [COD] Failed to insert COD collection for order ${orderId}:`, insertErr);
      } else {
        console.log(`✅ [COD] Collection recorded for order #${orderId} (Cash: ₹${customerCashCollected}, Partner: ₹${partnerEarning}, Payable: ₹${settlementPayable})`);
      }
    });
  });
};
