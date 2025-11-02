"use client"

import { motion } from "framer-motion"

export function StatsShowcase() {
  const stats = [
    { value: "2.5M+", label: "Data Points", icon: "📊", color: "from-accent/20 to-accent/5" },
    { value: "98%", label: "Uptime", icon: "⚡", color: "from-blue-400/20 to-blue-400/5" },
    { value: "1ms", label: "Latency", icon: "🚀", color: "from-cyan-400/20 to-cyan-400/5" },
    { value: "500+", label: "Enterprise Clients", icon: "🏢", color: "from-purple-400/20 to-purple-400/5" },
  ]

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-accent/3 to-background">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">Built for Scale & Speed</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enterprise infrastructure trusted by leading quantitative trading firms
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              className={`relative p-8 rounded-xl border border-accent/20 bg-gradient-to-br ${stat.color} backdrop-blur-sm overflow-hidden group`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ y: -5, borderColor: "var(--accent)" }}
            >
              <motion.div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="text-3xl mb-3">{stat.icon}</div>
                <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
