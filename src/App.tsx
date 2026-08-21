import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductPage } from "./pages/ProductPage";
import { SubmitPage } from "./pages/SubmitPage";
import { StoreProvider } from "./store/Store";

export default function App() {
  return (
    <StoreProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<Navigate to="/" replace />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </StoreProvider>
  );
}
