import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EngineerDetail } from './pages/EngineerDetail';
import { Settings } from './pages/Settings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="engineer/:username" element={<EngineerDetail />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
