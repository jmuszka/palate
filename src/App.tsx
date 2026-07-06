import { useEffect, useState, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'

export default function App() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<string[]>([])
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (!deferredQuery.trim()) { setResults([]); return }
    const controller = new AbortController()
    fetch(`${import.meta.env.VITE_SERVER_URL}/api/v1/words?prefix=${encodeURIComponent(deferredQuery)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(setResults)
      .catch(() => {})
    return () => controller.abort()
  }, [deferredQuery])

  return (
    <>
      <div className="flex items-center gap-2">
        <img src="/favicon.png" alt="" className="w-11 h-11" />
        <h1 className="text-zinc-900 text-xl font-semibold">EtymoMap</h1>
      </div>
      <p className="text-zinc-500 text-sm">An interactive mapping platform and etymological explorer built to trace the historical paths, ancestral roots, and geographic origins of words.</p>
      <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
        <p className="text-zinc-600 text-sm">From the viking invasions to the Norman-French conquest in 1066, and from post-Renaissance neologisms to its status as a global lingua franca, the English language boasts a fascinating history and development. Despite its origins as a West Germanic language, over two-thirds of the English lexicon consists of Romance vocabulary, mainly from French and Latin, with significant influence from Old Norse, Greek, and many others as well.</p>
      </div>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search words…"
          className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-800 placeholder-zinc-400 outline-none focus:border-zinc-400"
        />
        {results.length > 0 && (
          <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {results.map(word => (
              <button
                key={word}
                type="button"
                onClick={() => navigate(`/words/${encodeURIComponent(word)}`)}
                className="px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                {word}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
