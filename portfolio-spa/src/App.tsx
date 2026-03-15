import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from '@/components/Header';

const Home = lazy(() => import('@/pages/Home'));
const ResumeCreator = lazy(() => import('@/pages/ResumeCreator'));
const CVCreator = lazy(() => import('@/pages/CVCreator'));

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="min-h-screen">
          <Header />
          <Suspense fallback={
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-brown-300 border-t-accent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/resume" element={<ResumeCreator />} />
              <Route path="/cv" element={<CVCreator />} />
            </Routes>
          </Suspense>
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}
