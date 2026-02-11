import { useEffect } from "react";

type Props = {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
};

export default function AlertModal({
  message,
  type = "error",
  onClose,
}: Props) {
  /* ✅ Auto close after 3 seconds */
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-2xl p-6 w-80 text-center shadow-xl 
        animate-bounce-in ${
          type === "success" ? "border-green-400" : "border-red-400"
        } border-2`}
      >
        <div className="text-3xl mb-2">
          {type === "success" ? "✅" : "⚠️"}
        </div>

        <p className="text-lg font-semibold mb-4">{message}</p>

        <button
          onClick={onClose}
          className={`w-full py-2 rounded-lg font-medium ${
            type === "success"
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          }`}
        >
          OK
        </button>
      </div>

      {/* Animation */}
      <style>
        {`
          @keyframes bounceIn {
            0% { transform: scale(0.7); opacity: 0; }
            60% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); }
          }
          .animate-bounce-in {
            animation: bounceIn 0.35s ease-out;
          }
        `}
      </style>
    </div>
  );
}
