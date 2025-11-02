"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section id="cta" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="relative rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/5 to-secondary/5 p-12 lg:p-16 overflow-hidden text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          whileHover={{ borderColor: "var(--accent)" }}
        >
          {/* Animated background */}
          <motion.div
            className="absolute inset-0 -z-10 opacity-20"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-foreground">
              Ready to Master Your{" "}
              <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
                Trading Intelligence?
              </span>
            </h2>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Join leading quantitative traders and researchers who are already using Quntify to drive superior alpha
              generation.
            </p>

            <motion.button
              className="px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-accent/90 transition-all group mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Request Early Access
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>

            <p className="text-sm text-muted-foreground mt-6">
              🔐 Enterprise-grade security | 🚀 Real-time infrastructure | 📊 Multi-asset integration
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
