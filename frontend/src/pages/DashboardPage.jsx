import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies, useDeleteCompany, useSearchCompanies } from '../hooks/useCompanyData.js';
import { api } from '../api/client.js';
import DecisionBadge from '../components/DecisionBadge.jsx';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States.jsx';

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useCompanies();
  const deleteMutation = useDeleteCompany();
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Companies under review</h1>
          <p className="text-sm text-slate-400">Pick a company to see the full Company → Financial Health → Risks → Evidence → Decision workflow.</p>
        </div>
        <button onClick={() => setShowAdd((v) => !v)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg">
          + Add company
        </button>
      </div>

      {showAdd && <AddCompanyForm onCreated={() => { setShowAdd(false); refetch(); }} />}

      {isLoading && <LoadingState label="Loading companies…" />}
      {isError && <ErrorState message={error.message} />}

      {data && data.data.length === 0 && (
        <EmptyState
          title="No companies analysed yet"
          description="Add a company to kick off the research → extraction → scoring pipeline."
        />
      )}

      <div className="grid gap-3">
        {data?.data.map((c) => (
          <div
            key={c.id}
            className="card text-left flex items-center justify-between hover:border-white/25 transition-colors group"
          >
            <div onClick={() => navigate(`/companies/${c.id}`)} className="flex-1 cursor-pointer">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-slate-500">{c.sector} · {c.exchange} {c.ticker ? `· ${c.ticker}` : ''}</p>
            </div>
            <div className="flex items-center gap-4">
              <span onClick={() => navigate(`/companies/${c.id}`)} className="text-slate-500 text-sm cursor-pointer hover:text-white">View →</span>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(c.id); }}
                className="text-red-500 hover:text-red-400 text-sm bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddCompanyForm({ onCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loanAmount, setLoanAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: searchResults, isLoading: isSearching } = useSearchCompanies(searchQuery);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCompany) return;
    setLoading(true);
    setError(null);
    try {
      // Use the symbol as companyKey (without .NS/.BO if needed, or keep it. Actually, YahooFinance API handles exact symbols well)
      // Wait, researchAgent.js falls back to companyKey.toUpperCase() + '.NS' if search fails. 
      // If we pass the exact symbol (e.g. RELIANCE.NS) as companyKey, it might search for "RELIANCE.NS India" and fail.
      // Let's pass the exact symbol, but strip the .NS or .BO suffix to make it a clean companyKey.
      const companyKey = selectedCompany.symbol.replace(/\.(NS|BO)$/, '');
      
      await api.createCompany({ name: selectedCompany.name, companyKey, loanAmount: Number(loanAmount) });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card space-y-4 bg-slate-900/50 border-blue-500/20">
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <span className="text-xl">🔍</span>
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Smart Company Search</h3>
          <p className="text-xs text-slate-400">Search for any Indian company to automatically find its ticker and run the pipeline.</p>
        </div>
      </div>
      
      {error && <p className="text-sm text-red-400 bg-red-400/10 p-2 rounded">{error}</p>}
      
      {!selectedCompany ? (
        <div className="space-y-2 relative">
          <input 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder="E.g. Tata Motors, Reliance, Infosys..." 
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            autoFocus
          />
          {isSearching && <p className="text-xs text-slate-500 absolute right-3 top-3">Searching...</p>}
          
          {searchResults?.data?.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.data.map((c) => (
                <div 
                  key={c.symbol} 
                  onClick={() => setSelectedCompany(c)}
                  className="px-4 py-3 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                >
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.symbol} • {c.exchange} • {c.sector}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-blue-100">{selectedCompany.name}</p>
              <p className="text-xs text-blue-300">{selectedCompany.symbol} • {selectedCompany.exchange}</p>
            </div>
            <button type="button" onClick={() => setSelectedCompany(null)} className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-white/5 rounded">Change</button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">Requested Loan Amount (₹ Cr)</label>
              <input 
                value={loanAmount} 
                onChange={(e) => setLoanAmount(e.target.value)} 
                type="number" 
                min="0.1" 
                step="0.5" 
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="pt-5">
              <button disabled={loading} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg font-medium h-[38px]">
                {loading ? 'Running pipeline...' : 'Run Pipeline'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
