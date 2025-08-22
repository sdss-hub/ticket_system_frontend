import { useState } from 'react';

export default function SearchBar({
  onSearch,
  placeholder = 'Search...',
}: {
  onSearch: (q: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        className="input"
        placeholder={placeholder}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch(q.trim());
        }}
      />
      <button className="btn-primary" onClick={() => onSearch(q.trim())}>
        Search
      </button>
    </div>
  );
}
