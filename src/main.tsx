import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SWRConfig } from "swr";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import ToastProvider from "./components/Toast.tsx";
import { fetcher, ApiError } from "./lib/fetcher.ts";
import { toast } from "./lib/toast.ts";
import AboutPage from "./pages/AboutPage/AboutPage.tsx";
import App from "./pages/App.tsx";
import WordPage from "./pages/WordPage/WordPage.tsx";
import ComingSoon from "./pages/ComingSoon/ComingSoon.tsx";
import BlogPage from "./pages/BlogPage/BlogPage.tsx";
import BlogArticlePage from "./pages/BlogArticlePage/BlogArticlePage.tsx";
import Attributions from "./pages/Attributions/Attributions.tsx";
import FeedbackPage from "./pages/FeedbackPage/FeedbackPage.tsx";
import ChangelogPage from "./pages/ChangelogPage/ChangelogPage.tsx";
import GlossaryPage from "./pages/GlossaryPage/GlossaryPage.tsx";
import Layout from "./components/Layout.tsx";

function handleError(error: unknown) {
  const message =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
  toast(message, "error");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <SWRConfig value={{ fetcher, errorRetryCount: 0, onError: handleError }}>
          <BrowserRouter>
            <Routes>
              <Route
                element={
                  <Layout>
                    <Outlet />
                  </Layout>
                }
              >
                <Route path="/" element={<App />} />
                <Route path="/words/:word" element={<WordPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/blog/articles" element={<BlogPage />} />
                <Route path="/blog/articles/:slug" element={<BlogArticlePage />} />
                <Route path="/games" element={<ComingSoon title="Games" path="/games" />} />
                <Route path="/attributions" element={<Attributions />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SWRConfig>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
