"use client"

import { motion } from "framer-motion"
import { BarChart3, AlertCircle, Zap, TrendingUp, Lock, Cpu } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: BarChart3,
      title: "Multi-Asset Analytics",
      description: "Unified analytics across commodities, FI, energy, and equities with real-time data integration.",
      gradient: "from-blue-500/20 to-blue-500/5",
    },
    {
      icon: AlertCircle,
      title: "Smart Alerts & Signals",
      description:
        "AI-powered alerts for stat arb opportunities, risk-premia shifts, and market microstructure changes.",
      gradient: "from-cyan-500/20 to-cyan-500/5",
    },
    {
      icon: Zap,
      title: "Lightning Fast Execution",
      description:
        "Sub-millisecond data processing with institutional-grade infrastructure for term-structure trading.",
      gradient: "from-yellow-500/20 to-yellow-500/5",
    },
    {
      icon: TrendingUp,
      title: "Micro-Alpha Discovery",
      description: "Discover and backtest micro-alphas across market regimes with advanced signal generation.",
      gradient: "from-green-500/20 to-green-500/5",
    },
    {
      icon: Lock,
      title: "Institutional Security",
      description: "SOC 2 Type II compliant with encryption-at-rest, audit trails, and role-based access control.",
      gradient: "from-purple-500/20 to-purple-500/5",
    },
    {
      icon: Cpu,
      title: "API-First Design",
      description:
        "Flexible REST and WebSocket APIs for seamless integration with your existing trading infrastructure.",
      gradient: "from-pink-500/20 to-pink-500/5",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-accent/2">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Engineered for{" "}
            <span className="bg-gradient-to-r from-accent to-accent/60 bg-clip-text text-transparent">
              Quantitative Excellence
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built features for professional traders and researchers managing complex multi-asset strategies.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                className={`group relative p-6 rounded-xl border border-border bg-gradient-to-br ${feature.gradient} backdrop-blur-sm overflow-hidden hover:border-accent/50 transition-all duration-300`}
                variants={itemVariants}
                whileHover={{ y: -8, borderColor: "var(--accent)" }}
              >
                <motion.div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <motion.div
                    className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                  >
                    <Icon size={24} className="text-accent" />
                  </motion.div>

                  <h3 className="text-lg font-bold mb-2 text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

                  <motion.div className="mt-4 w-full h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
