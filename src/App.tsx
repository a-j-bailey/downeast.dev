import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Projects } from "./pages/Projects";
import { Thoughts } from "./pages/Thoughts";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route element={<Layout />}>
        <Route path="/projects" element={<Projects />} />
        <Route path="/thoughts" element={<Thoughts />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
