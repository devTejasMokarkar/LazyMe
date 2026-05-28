"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Gift,
  RefreshCw,
  Loader2,
  Sparkles,
  ArrowUpRight,
  Clock,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  operation: string | null;
  balanceAfter: number;
  createdAt: string;
}

interface CreditsDashboardProps {
  onBuyCredits: () => void;
}

export default function CreditsDashboard({ onBuyCredits }: CreditsDashboardProps) {
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  async function fetchCredits() {
    setLoading(true);
    try {
      const res = await fetch("/api/user/credits");
      const data = await res.json();
      setBalance(data.balance ?? 0);
      setTransactions(data.transactions || []);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const isLow = (balance ?? 0) < 10;

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 p-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Coins className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-semibold text-on-surface-variant">Credit Balance</span>
            </div>
            <button onClick={fetchCredits} className="p-2 rounded-lg hover:bg-surface-container-highest/50 text-on-surface-variant transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <motion.div
            key={balance}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-4"
          >
            <span className={cn("text-5xl font-bold tracking-tight", isLow ? "text-error" : "text-on-surface")}>
              {balance}
            </span>
            <span className="text-lg text-on-surface-variant ml-2">credits</span>
          </motion.div>

          {isLow && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2 mb-4"
            >
              <Zap className="w-4 h-4 text-error shrink-0" />
              <span className="text-sm text-error font-medium">
                Low balance! Add your own API key for free usage, or purchase credits.
              </span>
            </motion.div>
          )}

          <button
            onClick={onBuyCredits}
            className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Buy Credits
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Usage Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Total Earned",
            value: transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
            icon: Gift,
            color: "text-green-500",
          },
          {
            label: "Total Used",
            value: Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
            icon: TrendingDown,
            color: "text-orange-400",
          },
          {
            label: "Operations",
            value: transactions.filter((t) => t.type === "usage").length,
            icon: Zap,
            color: "text-primary",
          },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 text-center">
            <stat.icon className={cn("w-4 h-4 mx-auto mb-1", stat.color)} />
            <p className="text-lg font-bold text-on-surface">{stat.value}</p>
            <p className="text-xs text-on-surface-variant">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Transaction History */}
      <div>
        <h3 className="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-on-surface-variant" />
          Recent Activity
        </h3>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/60">
            <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low/50 border border-outline-variant/10 hover:bg-surface-container-low transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  tx.amount > 0 ? "bg-green-500/10" : "bg-orange-400/10"
                )}>
                  {tx.amount > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{tx.description}</p>
                  <p className="text-xs text-on-surface-variant/60">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-sm font-bold",
                    tx.amount > 0 ? "text-green-500" : "text-orange-400"
                  )}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </span>
                  <p className="text-xs text-on-surface-variant/40">{tx.balanceAfter} bal</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
