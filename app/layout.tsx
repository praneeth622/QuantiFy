import type React from "react"
import type { Metadata } from "next"

import "./globals.css"

import { Poppins, Geist_Mono, Lora } from 'next/font/google'

// Initialize fonts
const _poppins = Poppins({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _geistMono = Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })
const _lora = Lora({ subsets: ['latin'], weight: ["400","500","600","700"] })

export const metadata: Metadata = {
  title: "QuantiFy — Quantitative Analytics for Modern Traders",
  description:
    "QuantiFy is a helper analytics platform for traders and researchers at Multi-Factor Trading (MFT) firms — supporting stat-arb, risk-premia harvesting, market-making, term-structure analysis, and micro-alphas across commodities, fixed income, energy, and equities.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
