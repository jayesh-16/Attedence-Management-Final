const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "TCET | Mme Attendance",
  description: "Attendance Management System for TCET MME",
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
    shortcut: '/favicon.ico',
    other: [
      {
        url: '/favicon.ico',
        sizes: '16x16',
        type: 'image/x-icon'
      },
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon'
      }
    ]
  },
};
