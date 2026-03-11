import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import TranscribePage from '@/pages/TranscribePage';
import BattlePage from '@/pages/BattlePage';
import BatchBattlePage from '@/pages/BatchBattlePage';
import AboutPage from '@/pages/AboutPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/transcribe" replace />} />
        <Route path="transcribe" element={<TranscribePage />} />
        <Route path="battle" element={<BattlePage />} />
        <Route path="batch-battle" element={<BatchBattlePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  );
}
