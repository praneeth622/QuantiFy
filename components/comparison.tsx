"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"

export function Comparison() {
  const comparison = [
    { feature: "Real-time Multi-Asset Data", quntify: true, competitors: false },
    { feature: "Sub-millisecond Latency", quntify: true, competitors: false },
    { feature: "AI-Powered Signal Generation", quntify: true, competitors: true },
    { feature: "Term-Structure Analytics", quntify: true, competitors: false },
    { feature: "Institutional Security (SOC 2)", quntify: true, competitors: true },
    { feature: "API-First Architecture", quntify: true, competitors: false },
    { feature: "Backtesting Engine", quntify: true, competitors: true },
    { feature: "White-Label Options", quntify: true, competitors: false },
  ]

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/5 to-background">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">How Quntify Compares</h2>
          <p className="text-lg text-muted-foreground">
            Purpose-built for professional traders. Advanced capabilities at competitive pricing.
          </p>
        </motion.div>

        <motion.div
          className="overflow-x-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-semibold text-foreground">Feature</th>
                <th className="text-center py-4 px-4 font-semibold text-foreground">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-lg border border-accent/30">
                    <span>Quntify</span>
                  </div>
                </th>
                <th className="text-center py-4 px-4 font-semibold text-muted-foreground">Competitors</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((item, idx) => (
                <motion.tr
                  key={item.feature}
                  className="border-b border-border hover:bg-accent/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <td className="py-4 px-4 text-foreground">{item.feature}</td>
                  <td className="text-center py-4 px-4">
                    {item.quntify ? (
                      <motion.div
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 border border-accent/50"
                        whileInView={{ scale: 1.2 }}
                      >
                        <Check size={16} className="text-accent" />
                      </motion.div>
                    ) : (
                      <div className="inline-flex items-center justify-center w-6 h-6">—</div>
                    )}
                  </td>
                  <td className="text-center py-4 px-4">
                    {item.competitors ? (
                      <Check size={16} className="inline text-muted-foreground" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  )
}
