import type { Metadata } from "next"
import { Orbitron, Inter } from "next/font/google"
import "./globals.css"

const display = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Delta World Cup — Draft Order Tracker",
  description:
    "Live standings for the 2026 Delta Fantasy Football League draft order, decided by the FIFA World Cup.",
}

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="font-body relative">
        {children}
        {modal}
      </body>
    </html>
  )
}
