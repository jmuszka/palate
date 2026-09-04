import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { SWRConfig } from "swr";
import "./index.css";
import ErrorBoundary from "./ErrorBoundary.tsx";
import ToastProvider from "./Toast.tsx";
import { fetcher, ApiError } from "./fetcher.ts";
import { toast } from "./toast.ts";
import AboutPage from "./AboutPage.tsx";
import App from "./App.tsx";
import WordPage from "./WordPage.tsx";
import ComingSoon from "./ComingSoon.tsx";
import BlogPage from "./BlogPage.tsx";
import BlogArticlePage from "./BlogArticlePage.tsx";
import Attributions from "./Attributions.tsx";
import FeedbackPage from "./FeedbackPage.tsx";
import ChangelogPage from "./ChangelogPage.tsx";
import GlossaryPage from "./GlossaryPage.tsx";
import Layout from "./Layout.tsx";

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
