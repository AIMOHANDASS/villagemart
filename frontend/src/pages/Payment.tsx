// src/pages/Payment.tsx

export default function Payment() {
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Payment</h1>
      <p>Choose a UPI Payment Method</p>
      <div className="flex gap-4 mt-4">
        <button className="bg-purple-600 text-white px-4 py-2 rounded">GPay</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded">PhonePe</button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Paytm</button>
      </div>
      <button className="bg-black text-white px-4 py-2 mt-6 rounded">Confirm Payment</button>
    </div>
  );
}
