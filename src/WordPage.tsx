import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function WordPage() {
  const { word } = useParams<{ word: string }>()
  const navigate = useNavigate()
  const [etymology, setEtymology] = useState<unknown>(null)
  const [ipa, setIpa] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (word) document.title = `${word} - EtymoMap`
    return () => { document.title = 'EtymoMap' }
  }, [word])

  useEffect(() => {
    if (!word) return
    setLoading(true)
    setError(null)
    setIpa(null)
    const base = `${import.meta.env.VITE_SERVER_URL}/api/v1/words/${encodeURIComponent(word)}`
    fetch(`${base}/etymology`)
      .then(r => r.json())
      .then(data => { setEtymology(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
    fetch(`${base}/ipa`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setIpa(data?.ipa ?? null) })
      .catch(() => {})
  }, [word])

  return (
    <>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors w-fit"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>
      <div className="flex items-baseline gap-3">
        <h1 className="text-zinc-900 text-2xl font-semibold">{word}</h1>
        {ipa && <span className="text-zinc-400 text-sm">{ipa}</span>}
      </div>
      {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {etymology !== null && !loading && (
        <pre className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-600 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(etymology, null, 2)}
        </pre>
      )}
    </>
  )
}
