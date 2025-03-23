# Attendance Management System

A modern, responsive Attendance Management System built with Next.js, Supabase, and shadcn/ui.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjayesh-16%2FAttedence-Management-Final)

## Features

- Modern Dashboard UI with real-time attendance tracking
- Multi-class attendance management (SE, TE, BE)
- Admin-only features for adding students, teachers, and subjects
- Analytics and reporting system
- Responsive design for all devices
- Real-time data updates using Supabase
- Secure authentication system

## Tech Stack

- Next.js 14 (App Router)
- Supabase (Database & Authentication)
- shadcn/ui (UI Components)
- Tailwind CSS (Styling)
- Framer Motion (Animations)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jayesh-16/Attedence-Management-Final.git
```

2. Install dependencies:
```bash
cd Attedence-Management-Final
npm install
```

3. Create a `.env.local` file with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in your project root with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can get these values from your Supabase project dashboard.

## Project Structure

```
├── app/                 # Next.js App Router pages and API routes
├── components/          # Reusable React components
├── public/             # Static assets
├── src/                # Source code
├── utils/              # Utility functions and helpers
└── types/              # TypeScript type definitions
```

## Deployment

The application is ready for deployment with Vercel. Click the "Deploy with Vercel" button above or follow these steps:

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Add the following environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
