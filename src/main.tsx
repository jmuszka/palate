import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import WordPage from './WordPage.tsx'
import ComingSoon from './ComingSoon.tsx'
import Layout from './Layout.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<App />} />
          <Route path="/words/:word" element={<WordPage />} />
          <Route path="/about" element={<ComingSoon title="About" />} />
          <Route path="/blog/articles" element={<ComingSoon title="Blog" />} />
          <Route path="/games" element={<ComingSoon title="Games" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
