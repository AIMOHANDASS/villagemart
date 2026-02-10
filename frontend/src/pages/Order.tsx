import { useState } from "react";
import { createOrder } from "../api";

const Order = () => {
  const [order, setOrder] = useState({
    userId: 1,
    totalAmount: 500,
    items: [
      { name: "Rice", price: 250, qty: 1 },
      { name: "Dal", price: 250, qty: 1 },
    ],
  });

  const placeOrder = async () => {
    try {
      const data = await createOrder(order);
      alert("Order placed. Order ID: " + data.orderId);
    } catch (err) {
      alert("Order failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Place Order</h2>
      <button onClick={placeOrder}>Place Order</button>
    </div>
  );
};

export default Order;
