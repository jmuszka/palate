import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Layout from './Layout'

export default function WordPage() {
  const { word } = useParams<{ word: string }>()
  const [etymology, setEtymology] = useState<unknown>(null)
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
    fetch(`http://localhost:8080/api/v1/words/${encodeURIComponent(word)}/etymology`)
      .then(r => r.json())
      .then(data => { setEtymology(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [word])

  return (
    <Layout>
      <h1 className="text-zinc-900 text-2xl font-semibold">{word}</h1>
      {loading && <p className="text-zinc-400 text-sm">Loading…</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {etymology !== null && !loading && (
        <pre className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-xs text-zinc-600 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(etymology, null, 2)}
        </pre>
      )}
    </Layout>
  )
}
