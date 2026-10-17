import './globals.css'

export const metadata = {
  title: 'DoorRelay',
  description: 'Accessible Ring doorbell activity and household responses',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dash-dark text-slate-200">
        {children}
      </body>
    </html>
  )
}
