import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Goal Tracker',
  description: 'Track your goals and tasks',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
