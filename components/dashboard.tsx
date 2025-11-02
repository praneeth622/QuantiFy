"use client"

import { motion } from "framer-motion"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function Dashboard() {
  const chartData = [
    { name: "Jan", value: 4000, pnl: 2400 },
    { name: "Feb", value: 3000, pnl: 1398 },
    { name: "Mar", value: 2000, pnl: 9800 },
    { name: "Apr", value: 2780, pnl: 3908 },
    { name: "May", value: 1890, pnl: 4800 },
    { name: "Jun", value: 2390, pnl: 3800 },
  ]

  return (
    <section id="dashboard" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Dashboard{" "}
            <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">Preview</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Visualize your trading performance and analytics in real-time with our advanced dashboard.
          </p>
        </motion.div>

        <motion.div
          className="relative rounded-2xl border border-accent/30 bg-card p-6 lg:p-8 overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          whileHover={{ borderColor: "var(--accent)", boxShadow: "0 0 40px rgba(79, 70, 229, 0.1)" }}
        >
          {/* Animated background */}
          <motion.div
            className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10"
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
            }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Stats cards */}
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {[
                { label: "Total Return", value: "+24.8%", change: "+2.3% this month" },
                { label: "Sharpe Ratio", value: "2.14", change: "Excellent risk-adjusted return" },
                { label: "Max Drawdown", value: "-8.5%", change: "Within tolerance" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  className="p-4 bg-background border border-border rounded-lg hover:border-accent/50 transition-colors"
                  whileHover={{ x: 5 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-xs text-accent">{stat.change}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Chart */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(79, 70, 229, 0.1)" />
                  <XAxis dataKey="name" stroke="rgba(0, 0, 0, 0.3)" />
                  <YAxis stroke="rgba(0, 0, 0, 0.3)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid rgba(79, 70, 229, 0.3)",
                      borderRadius: "8px",
                      color: "#000",
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pnl" stroke="rgba(79, 70, 229, 0.4)" strokeWidth={1} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
