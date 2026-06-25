import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  ShoppingCart,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateResponse,
  speakText,
  stopSpeaking,
  type AiMessage,
  type Product,
} from "@/lib/aiAssistant";
import { useVoiceSearch, type VoiceLang } from "@/hooks/useVoiceSearch";
import toast from "react-hot-toast";

/* ================================================================
   PRODUCT MINI CARD (inside chat)
================================================================ */

const ProductMiniCard: React.FC<{
  product: Product;
  onAdd: (p: Product) => void;
}> = ({ product, onAdd }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
  >
    <img
      src={product.image}
      alt={product.name}
      className="w-10 h-10 rounded-lg object-cover shrink-0"
      loading="lazy"
    />
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-foreground truncate">
        {product.name}
      </p>
      <p className="text-[10px] text-primary font-bold">₹{product.price}</p>
    </div>
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.stopPropagation();
        onAdd(product);
      }}
      className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
    >
      Add +
    </motion.button>
  </motion.div>
);

/* ================================================================
   TYPING DOTS ANIMATION
================================================================ */

const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 px-3 py-2">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 bg-primary/50 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </div>
);

/* ================================================================
   QUICK ACTIONS
================================================================ */

const QUICK_ACTIONS = [
  { label: "🔍 Search", text: "Show vegetables" },
  { label: "💡 Suggest", text: "recommend products" },
  { label: "🛒 My Cart", text: "show my cart" },
  { label: "📍 Location", text: "delivery area" },
];

/* ================================================================
   MAIN COMPONENT
================================================================ */

const AiAssistant: React.FC = () => {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>("en-IN");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------- Voice search hook ---------- */
  const handleVoiceResult = useCallback((text: string) => {
    if (text.trim()) {
      setInputText(text);
      // Auto-send after voice recognition
      setTimeout(() => sendMessage(text), 300);
    }
  }, []);

  const voice = useVoiceSearch(handleVoiceResult);

  // Sync voice language
  useEffect(() => {
    voice.setLang(voiceLang);
  }, [voiceLang]);

  /* ---------- Auto-scroll to bottom ---------- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  /* ---------- Welcome message on first open ---------- */
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage("hello");
    }
  }, [isOpen]);

  /* ---------- Send message ---------- */
  const sendMessage = async (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg) return;

    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: msg,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate thinking delay
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));

    const aiResponse = await generateResponse(msg);
    setMessages((prev) => [...prev, aiResponse]);
    setIsTyping(false);

    // Auto-speak response if user was using voice
    if (voice.isListening || text) {
      // Don't auto-speak, let user choose
    }
  };

  /* ---------- Add product to cart ---------- */
  const addProductToCart = (product: Product) => {
    const rawCart = localStorage.getItem("cart");
    let cart: any[] = rawCart ? JSON.parse(rawCart) : [];

    if (cart.find((i: any) => i.id === product.id)) {
      toast("Already in cart!", { icon: "ℹ️" });
      return;
    }

    let unit = "unit";
    if (["Groceries", "Vegetables", "Fruits"].includes(product.category)) {
      unit = "kg";
    }

    cart.push({
      ...product,
      quantity: unit === "kg" ? 0.5 : 1,
      unit,
      deliveryDate: null,
    });

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("storage"));
    toast.success(`${product.name} added to cart!`);
  };

  /* ---------- Handle action buttons ---------- */
  const handleAction = (action?: AiMessage["action"]) => {
    if (!action) return;
    if (action.type === "navigate" && action.payload) {
      navigate(action.payload);
      setIsOpen(false);
    }
    if (action.type === "add_cart" && action.product) {
      addProductToCart(action.product);
    }
  };

  /* ---------- Toggle speak ---------- */
  const toggleSpeak = (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      speakText(text, voiceLang);
      setIsSpeaking(true);
      // Reset after speech ends
      setTimeout(() => setIsSpeaking(false), 5000);
    }
  };

  /* ---------- Toggle voice input ---------- */
  const toggleVoice = () => {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening();
    }
  };

  return (
    <>
      {/* ============ FLOATING BUTTON ============ */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 md:bottom-8 right-5 z-50 w-14 h-14 bg-black text-white hover:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center transition-all"
            aria-label="Open AI Assistant"
          >
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30"
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <Bot className="h-6 w-6 relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ============ CHAT WINDOW ============ */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-0 right-0 md:bottom-6 md:right-4 z-50 w-full md:w-[380px] h-[80vh] md:h-[75vh] bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700"
          >
            {/* ---- Header ---- */}
            <div className="bg-gradient-to-r from-gray-900 to-black rounded-t-3xl md:rounded-t-3xl px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-9 h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
                >
                  <Bot className="h-5 w-5 text-white" />
                </motion.div>
                <div>
                  <h3 className="text-white font-bold text-sm">
                    VillageMart AI
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1.5 h-1.5 bg-emerald-300 rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-white/80 text-[10px]">
                      Online • EN + தமிழ்
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Language Toggle */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() =>
                    setVoiceLang((p) => (p === "en-IN" ? "ta-IN" : "en-IN"))
                  }
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  {voiceLang === "en-IN" ? "EN" : "தமி"}
                </motion.button>

                {/* Close */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    setIsOpen(false);
                    stopSpeaking();
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* ---- Messages ---- */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] ${
                      msg.role === "user"
                        ? "bg-black text-white rounded-2xl rounded-br-sm px-4 py-2.5"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm"
                    }`}
                  >
                    {/* Message header */}
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.role === "assistant" ? (
                        <Bot className="h-3 w-3 text-primary shrink-0" />
                      ) : (
                        <User className="h-3 w-3 shrink-0" />
                      )}
                      <span className="text-[9px] opacity-60">
                        {msg.role === "assistant"
                          ? "VillageMart AI"
                          : "You"}
                      </span>
                    </div>

                    {/* Message text */}
                    <div className="text-xs leading-relaxed whitespace-pre-line">
                      {msg.text.split("\n").map((line, i) => {
                        // Bold text
                        const parts = line.split(/\*\*(.+?)\*\*/g);
                        return (
                          <React.Fragment key={i}>
                            {parts.map((part, j) =>
                              j % 2 === 1 ? (
                                <strong key={j}>{part}</strong>
                              ) : (
                                <span key={j}>{part}</span>
                              )
                            )}
                            {i < msg.text.split("\n").length - 1 && <br />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Product cards */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {msg.products.map((p) => (
                          <ProductMiniCard
                            key={p.id}
                            product={p}
                            onAdd={addProductToCart}
                          />
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    {msg.action && msg.action.type !== "none" && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction(msg.action)}
                        className="mt-2 w-full text-[10px] font-semibold py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1"
                      >
                        {msg.action.type === "navigate" ? (
                          <>
                            <ExternalLink className="h-3 w-3" />
                            Go to{" "}
                            {msg.action.payload?.includes("cart")
                              ? "Cart"
                              : msg.action.payload?.includes("checkout")
                              ? "Checkout"
                              : "Page"}
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-3 w-3" />
                            Add to Cart
                          </>
                        )}
                      </motion.button>
                    )}

                    {/* Speak button for AI messages */}
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => toggleSpeak(msg.text)}
                        className="mt-1.5 text-[9px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        {isSpeaking ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        {isSpeaking ? "Stop" : "Listen"}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700 px-2 py-1">
                    <TypingDots />
                  </div>
                </motion.div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* ---- Quick Actions (shown when few messages) ---- */}
            {messages.length <= 2 && (
              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
                {QUICK_ACTIONS.map((action) => (
                  <motion.button
                    key={action.label}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(action.text)}
                    className="shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm"
                  >
                    {action.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* ---- Voice listening indicator ---- */}
            <AnimatePresence>
              {voice.isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-3 pb-1"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/40">
                    <motion.div
                      className="w-2 h-2 bg-red-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                      {voice.interimText
                        ? voice.interimText
                        : voiceLang === "ta-IN"
                        ? "கேட்கிறேன்... பேசுங்கள்"
                        : "Listening... Speak now"}
                    </span>

                    {/* Voice wave animation */}
                    <div className="flex items-center gap-0.5 ml-auto">
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-red-400 rounded-full"
                          animate={{
                            height: [4, 12 + Math.random() * 8, 4],
                          }}
                          transition={{
                            duration: 0.4 + Math.random() * 0.3,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---- Input Bar ---- */}
            <div className="sticky bottom-0 shrink-0 px-3 pb-3 pt-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 md:rounded-b-3xl">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      voiceLang === "ta-IN"
                        ? "இங்கே தட்டச்சு செய்யுங்கள்..."
                        : "Ask anything..."
                    }
                    className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                    disabled={voice.isListening}
                  />
                </div>

                {/* Mic Button */}
                {voice.isSupported && (
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={toggleVoice}
                    className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-sm ${
                      voice.isListening
                        ? "bg-red-500 text-white shadow-red-500/30"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {voice.isListening ? (
                      <motion.div className="relative">
                        <motion.div
                          className="absolute inset-0 rounded-full bg-red-500/30"
                          animate={{
                            scale: [1, 2, 1],
                            opacity: [0.6, 0, 0.6],
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                          style={{ margin: "-4px" }}
                        />
                        <MicOff className="h-5 w-5 relative z-10" />
                      </motion.div>
                    ) : (
                      <Mic className="h-5 w-5" />
                    )}
                  </motion.button>
                )}

                {/* Send Button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => sendMessage()}
                  disabled={!inputText.trim() || voice.isListening}
                  className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-sm ${
                    inputText.trim()
                      ? "bg-black text-white shadow-md hover:bg-gray-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  <Send className="h-5 w-5" />
                </motion.button>
              </div>

              {/* Safe area spacing for mobile */}
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiAssistant;
