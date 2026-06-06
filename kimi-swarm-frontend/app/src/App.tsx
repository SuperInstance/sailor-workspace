import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Scratch from './pages/Scratch';
import Crafter from './pages/Crafter';
import Forge from './pages/Forge';
import Guild from './pages/Guild';
import Vault from './pages/Vault';
import Quests from './pages/Quests';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/scratch" element={<Scratch />} />
          <Route path="/crafter" element={<Crafter />} />
          <Route path="/forge" element={<Forge />} />
          <Route path="/guild" element={<Guild />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/quests" element={<Quests />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
