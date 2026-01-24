import { useEffect, useState } from 'react';
import { supabase } from './services/supabase';

function App() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test database connection by querying courses table
      const { error } = await supabase.from('courses').select('count');

      if (error) {
        setConnectionStatus('error');
        setErrorMessage(error.message);
        console.error('Supabase connection error:', error);
      } else {
        setConnectionStatus('connected');
      }
    } catch (err) {
      setConnectionStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
      console.error('Connection test failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ORION</h1>
          <p className="text-gray-600 mb-8">E-Learning Authoring Platform</p>

          <div className="mb-6">
            {connectionStatus === 'testing' && (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-gray-700">Testing Supabase connection...</span>
              </div>
            )}

            {connectionStatus === 'connected' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-semibold">Connected to Supabase!</span>
                </div>
                <p className="text-green-600 text-sm mt-2">Database is ready</p>
              </div>
            )}

            {connectionStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-2 text-red-700 mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="font-semibold">Connection Failed</span>
                </div>
                <p className="text-red-600 text-sm">{errorMessage}</p>
                <button
                  onClick={testConnection}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                  Retry Connection
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Setup Status</h2>
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700">React + TypeScript + Vite</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700">Tailwind CSS configured</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span className="text-gray-700">All dependencies installed</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={connectionStatus === 'connected' ? 'text-green-500' : 'text-gray-400'}>
                  {connectionStatus === 'connected' ? '✓' : '○'}
                </span>
                <span className="text-gray-700">Supabase connection</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            Week 1, Session {connectionStatus === 'connected' ? '2 Complete' : '2 In Progress'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
