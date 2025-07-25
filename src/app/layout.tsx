import type { Metadata } from "next"
import "./globals.css"
import { Geist, Geist_Mono, Yusei_Magic, Hepta_Slab } from "next/font/google"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const yusei = Yusei_Magic({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-yusei",
})

const hepta = Hepta_Slab({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-hepta",
})

export const metadata: Metadata = {
  title: "Luca",
  description: "男がやるオイルマッサージ屋さん",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${geistMono.variable} ${yusei.variable} ${hepta.variable}`}>
      <head>
        <link rel="stylesheet" href="/styles/top.css" />
      </head>
      <body className="font-yusei bg-gray-100 text-gray-800 antialiased">
        {children}
      </body>
    </html>
  )
}
