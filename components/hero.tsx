"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"

export function Hero() {
  return (
    <section className="relative min-h-screen pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-0 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
          transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-accent/6 rounded-full blur-3xl"
          animate={{ x: [0, -60, 0], y: [0, -50, 0] }}
          transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, delay: 1, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-background" />
      </div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 backdrop-blur-sm">
            <motion.div
              className="w-2 h-2 rounded-full bg-accent"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-sm font-medium text-foreground">Premium Quantitative Platform</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
            <motion.h1
              className="text-5xl lg:text-7xl font-bold mb-6 leading-tight text-foreground"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Trade Smarter{" "}
              <span className="bg-gradient-to-r from-accent via-accent/80 to-accent bg-clip-text text-transparent animate-gradient-shift">
                With Data
              </span>
            </motion.h1>

            <motion.p
              className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              Advanced analytics for stat arb, risk-premia, market-making, and micro-alphas. Designed for professional
              MFT traders across commodities, FI, energy, and equities.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.button
                className="px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(79, 70, 229, 0.2)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles size={18} />
                Request Access
                <ArrowRight size={18} className="group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                className="px-8 py-4 border border-foreground/20 rounded-lg font-semibold hover:bg-foreground/5 transition-all"
                whileHover={{ scale: 1.05, borderColor: "var(--accent)" }}
                whileTap={{ scale: 0.95 }}
              >
                View Demo
              </motion.button>
            </motion.div>

            <motion.div
              className="grid grid-cols-3 gap-6 pt-8 border-t border-border"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5, staggerChildren: 0.1 }}
            >
              {[
                { label: "Performance", value: "+340%", icon: "📈" },
                { label: "Assets Under Analysis", value: "$1.2T+", icon: "💰" },
                { label: "Trading Strategies", value: "50+", icon: "⚡" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <p className="text-2xl font-bold text-accent">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative h-full min-h-96 lg:min-h-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div
              className="relative w-full h-full rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5 p-8 backdrop-blur-xl overflow-hidden"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
            >
              {/* Animated chart visualization */}
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                  <motion.polyline
                    points="0,250 50,180 100,200 150,120 200,150 250,80 300,100 350,40 400,60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-accent"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2 }}
                  />
                </svg>
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
                <motion.div
                  className="text-5xl"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  📊
                </motion.div>
                <p className="text-sm font-medium text-foreground">Advanced Analytics Dashboard</p>
                <p className="text-xs text-muted-foreground text-center">Real-time multi-asset insights</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
