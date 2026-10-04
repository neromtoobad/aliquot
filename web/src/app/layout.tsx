import type {Metadata} from 'next'
import {Fraunces, Inter, JetBrains_Mono} from 'next/font/google'
import './globals.css'

const serif = Fraunces({variable: '--font-serif', subsets: ['latin'], axes: ['opsz', 'SOFT']})
const sans = Inter({variable: '--font-sans-ui', subsets: ['latin']})
const mono = JetBrains_Mono({variable: '--font-mono-ui', subsets: ['latin']})

export const metadata: Metadata = {
  title: 'Aliquot — the bench-side protocol agent',
  description:
    'Ask what temperature, how long, how much, or whether it is safe. Answers come from manufacturer manuals and published protocols, reconciled in a Sanity Knowledge Base, with the numbers computed from structured data.',
}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
