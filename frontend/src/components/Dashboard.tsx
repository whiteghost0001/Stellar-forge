import { useState, useEffect } from 'react'
import { Input } from './UI/Input'
import { useDebounce } from '../hooks/useDebounce'
import { stellarService } from '../services/stellar'

export const Dashboard: React.FC = () => {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (!debouncedSearch) { setResults([]); return }
    stellarService.getTokenInfo(debouncedSearch).then((info) => setResults([info]))
  }, [debouncedSearch])

  return (
    <div className="space-y-4">
      <Input
        label="Search tokens"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by address or name..."
      />
      <ul className="space-y-2">
        {results.map((r, i) => (
          <li key={i} className="p-2 border rounded text-sm">{JSON.stringify(r)}</li>
        ))}
      </ul>
    </div>
  )
}
