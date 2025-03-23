const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "TCET | Mme Attendance",
  description: "Attendance Management System for TCET MME",
  icons: {
    icon: {
      url: '/favicon.png',
      type: 'image/png',
      sizes: '16x16 32x32 48x48'
    },
    apple: {
      url: '/favicon.png',
      type: 'image/png',
      sizes: '180x180'
    },
    shortcut: {
      url: '/favicon.png',
      type: 'image/png'
    }
  },
};
