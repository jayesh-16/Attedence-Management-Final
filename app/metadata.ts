const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "TCET | Mme Attendance",
  description: "Attendance Management System for TCET MME",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
    shortcut: '/favicon.png',
    other: [
      {
        url: '/favicon.png',
        sizes: '16x16',
        type: 'image/png'
      },
      {
        url: '/favicon.png',
        sizes: '32x32',
        type: 'image/png'
      },
      {
        url: '/favicon.png',
        sizes: '48x48',
        type: 'image/png'
      }
    ]
  },
};
