import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface HealthResponse {
  status: string;
  dbConnected: boolean;
  timestamp: string;
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [state, setState] = useState<FetchState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchHealth = async () => {
    setState('loading');
    setErrorMsg('');
    try {
      const res = await api.get<HealthResponse>('/api/health');
      setData(res.data);
      setState('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-6 text-foreground">API Health</h1>

      {state === 'loading' && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground animate-pulse">Checking API…</p>
          </CardContent>
        </Card>
      )}

      {state === 'error' && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
              API Unreachable
            </CardTitle>
            <CardDescription className="text-red-600">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={fetchHealth}
              className="text-sm underline text-red-700 hover:text-red-900"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {state === 'success' && data && (
        <Card className="border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
              API is healthy
            </CardTitle>
            <CardDescription className="text-green-700">
              Last checked: {new Date(data.timestamp).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-green-900">
            <div className="flex justify-between">
              <span className="font-medium">Status</span>
              <span>{data.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Database</span>
              <span className={data.dbConnected ? 'text-green-700' : 'text-red-600'}>
                {data.dbConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <button
              onClick={fetchHealth}
              className="mt-4 text-sm underline text-green-800 hover:text-green-950"
            >
              Refresh
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
