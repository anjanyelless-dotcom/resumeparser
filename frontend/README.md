# Resume Parser Frontend

Production-ready React TypeScript frontend for the Resume Parser platform.

## Features

- Vite + React + TypeScript
- Tailwind CSS design system
- React Router navigation
- React Query for server state
- Axios client configured via environment variables

## Requirements

- Node.js 18+
- npm

## Setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Configure environment variables:

   ```bash
   cp .env.example .env
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Configuration

- `VITE_API_URL` - Base URL for the backend API (default: `http://localhost:8000`)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
