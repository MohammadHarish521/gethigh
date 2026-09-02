import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { TermsPage } from "./pages/TermsPage";
import { BikePage } from "./pages/BikePage";
import { LiveStatsPage } from "./pages/LiveStatsPage";
import { ProductPage } from "./pages/ProductPage";
import { PaymentSuccessPage } from "./pages/PaymentSuccessPage";
import { MockCheckoutPage } from "./pages/MockCheckoutPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<Navigate to="/" replace />} />
          <Route path="/submit" element={<Navigate to="/" replace />} />
          <Route path="/my-bids" element={<Navigate to="/" replace />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/bike" element={<BikePage />} />
          <Route path="/live" element={<LiveStatsPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/mock/:paymentId" element={<MockCheckoutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
