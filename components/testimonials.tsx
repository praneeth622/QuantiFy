"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"

export function Testimonials() {
  const testimonials = [
    {
      name: "Alex Chen",
      role: "Head of Quant Research",
      company: "Artemis Capital",
      text: "Quntify transformed how we analyze stat arb opportunities. The real-time multi-asset integration is unmatched.",
      rating: 5,
    },
    {
      name: "Sarah Mitchell",
      role: "Trading Director",
      company: "Citadel Securities",
      text: "The micro-alpha discovery engine has become essential to our term-structure trading strategy.",
      rating: 5,
    },
    {
      name: "James Rodriguez",
      role: "Risk Manager",
      company: "Point72",
      text: "Outstanding execution speed and institutional-grade reliability. Highly recommended.",
      rating: 5,
    },
  ]

  return (
    <section
      id="testimonials"
      className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/3 via-transparent to-transparent"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              Industry Leaders
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              className="p-6 bg-card border border-border rounded-xl hover:border-accent/50 transition-all"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={16} className="fill-accent text-accent" />
                ))}
              </div>

              <p className="text-foreground mb-4 leading-relaxed">{testimonial.text}</p>

              <div className="pt-4 border-t border-border">
                <p className="font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                <p className="text-xs text-accent">{testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
