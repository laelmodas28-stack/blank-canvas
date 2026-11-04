import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Precificacao from "./pages/Precificacao";
import SimuladorPreco from "./pages/SimuladorPreco";
import GeradorImagens from "./pages/GeradorImagens";
import CriarAnuncio from "./pages/CriarAnuncio";
import Historico from "./pages/Historico";
import Configuracoes from "./pages/Configuracoes";
import Preferencias from "./pages/Preferencias";
import Taxas from "./pages/Taxas";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Módulos ocultos do menu: redirecionam para o Início sem apagar código nem dados. */}
          <Route path="/estrategia" element={<Navigate to="/dashboard" replace />} />
          <Route path="/financeiro" element={<Navigate to="/dashboard" replace />} />
          <Route path="/precificacao" element={<Precificacao />} />
          <Route path="/simulador-preco" element={<Navigate to="/precificacao" replace />} />
          <Route path="/radar-produtos" element={<Navigate to="/dashboard" replace />} />
          <Route path="/gerador-imagens" element={<GeradorImagens />} />
          <Route path="/analise-mercado" element={<Navigate to="/dashboard" replace />} />
          <Route path="/produtos-vencedores" element={<Navigate to="/dashboard" replace />} />
          <Route path="/cacador-produtos" element={<Navigate to="/dashboard" replace />} />
          <Route path="/criar-anuncio" element={<CriarAnuncio />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/taxas" element={<Taxas />} />
          <Route path="/preferencias" element={<Preferencias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
