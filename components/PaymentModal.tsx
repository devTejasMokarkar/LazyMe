"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CreditCard,
  Sparkles,
  Shield,
  Zap,
  Crown,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PACKS = [
  {
    id: "pack_100",
    credits: 100,
    priceINR: "₹99",
    priceUSD: "$1.99",
    label: "Starter",
    icon: Zap,
    color: "from-blue-500 to-cyan-400",
    popular: false,
  },
  {
    id: "pack_500",
    credits: 500,
    priceINR: "₹399",
    priceUSD: "$6.99",
    label: "Pro",
    icon: Sparkles,
    color: "from-purple-500 to-pink-400",
    popular: true,
  },
  {
    id: "pack_2000",
    credits: 2000,
    priceINR: "₹999",
    priceUSD: "$19.99",
    label: "Unlimited",
    icon: Crown,
    color: "from-amber-500 to-orange-400",
    popular: false,
  },
];

const GATEWAYS = [
  { id: "razorpay", name: "Razorpay", icon: "🇮🇳", desc: "UPI, Cards, NetBanking", currency: "INR" },
  { id: "stripe", name: "Stripe", icon: "💳", desc: "Cards, Google Pay", currency: "USD" },
  { id: "paypal", name: "PayPal", icon: "🅿️", desc: "PayPal Balance, Cards", currency: "USD" },
];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (credits: number) => void;
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [selectedPack, setSelectedPack] = useState(PACKS[1]); // Pro by default
  const [selectedGateway, setSelectedGateway] = useState(GATEWAYS[0]); // Razorpay by default
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: selectedPack.id,
          gateway: selectedGateway.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      switch (selectedGateway.id) {
        case "stripe":
        case "paypal": {
          // Redirect to external checkout
          if (data.url) {
            window.location.href = data.url;
          }
          break;
        }
        case "razorpay": {
          // Load Razorpay checkout
          await loadRazorpayCheckout(data);
          break;
        }
      }
    } catch (err: any) {
      setError(err.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  }

  async function loadRazorpayCheckout(data: any) {
    // Dynamically load Razorpay script
    if (!(window as any).Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
      await new Promise<void>((resolve) => {
        script.onload = () => resolve();
      });
    }

    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: "LazyMe AI",
      description: `${selectedPack.credits} AI Credits`,
      order_id: data.orderId,
      handler: async function (response: any) {
        // Verify payment on server
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: data.paymentId,
            }),
          });

          const result = await verifyRes.json();
          if (result.success) {
            onSuccess?.(selectedPack.credits);
            onClose();
          } else {
            setError("Payment verification failed");
          }
        } catch {
          setError("Payment verification error");
        }
        setProcessing(false);
      },
      modal: {
        ondismiss: () => setProcessing(false),
      },
      theme: { color: "#6366f1" },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-surface border border-outline-variant/30 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-on-surface">Buy Credits</h2>
                    <p className="text-xs text-on-surface-variant">Power your AI features</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Pack Selection */}
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-3">Choose a pack</h3>
                <div className="grid grid-cols-3 gap-3">
                  {PACKS.map((pack) => {
                    const isSelected = selectedPack.id === pack.id;
                    return (
                      <button
                        key={pack.id}
                        onClick={() => setSelectedPack(pack)}
                        className={cn(
                          "relative p-4 rounded-2xl border-2 transition-all text-center",
                          isSelected
                            ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                            : "border-outline-variant/20 hover:border-outline-variant/40 bg-surface-container-low"
                        )}
                      >
                        {pack.popular && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-primary text-on-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                            POPULAR
                          </span>
                        )}
                        <div className={cn(
                          "w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center",
                          `bg-gradient-to-br ${pack.color} text-white`
                        )}>
                          <pack.icon className="w-5 h-5" />
                        </div>
                        <p className="text-lg font-bold text-on-surface">{pack.credits}</p>
                        <p className="text-xs text-on-surface-variant">credits</p>
                        <p className="text-sm font-bold text-primary mt-2">
                          {selectedGateway.currency === "INR" ? pack.priceINR : pack.priceUSD}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gateway Selection */}
              <div>
                <h3 className="text-sm font-bold text-on-surface mb-3">Payment method</h3>
                <div className="space-y-2">
                  {GATEWAYS.map((gw) => {
                    const isSelected = selectedGateway.id === gw.id;
                    return (
                      <button
                        key={gw.id}
                        onClick={() => setSelectedGateway(gw)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant/20 hover:border-outline-variant/40"
                        )}
                      >
                        <span className="text-2xl">{gw.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-on-surface">{gw.name}</p>
                          <p className="text-xs text-on-surface-variant">{gw.desc}</p>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-sm text-error">
                  {error}
                </div>
              )}

              {/* Security badge */}
              <div className="flex items-center gap-2 text-xs text-on-surface-variant/60">
                <Shield className="w-3.5 h-3.5" />
                <span>256-bit SSL encrypted. We never store your card details.</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Pay {selectedGateway.currency === "INR" ? selectedPack.priceINR : selectedPack.priceUSD} for {selectedPack.credits} credits
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
