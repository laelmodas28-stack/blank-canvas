import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Precificacao from "./pages/Precificacao";
import SimuladorPreco from "./pages/SimuladorPreco";
import RadarProdutos from "./pages/RadarProdutos";
import AnaliseMercado from "./pages/AnaliseMercado";
import CriarAnuncio from "./pages/CriarAnuncio";
import Historico from "./pages/Historico";
import Configuracoes from "./pages/Configuracoes";
import Preferencias from "./pages/Preferencias";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/precificacao" element={<Precificacao />} />
          <Route path="/simulador-preco" element={<SimuladorPreco />} />
          <Route path="/radar-produtos" element={<RadarProdutos />} />
          <Route path="/analise-mercado" element={<AnaliseMercado />} />
          <Route path="/criar-anuncio" element={<CriarAnuncio />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/preferencias" element={<Preferencias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
