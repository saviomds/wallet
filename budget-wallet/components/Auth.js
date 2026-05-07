'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registration successful! You can now log in.');
      }
    } catch (error) {
      setMessage(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-10 p-6 sm:p-10 glass-card text-center">
      <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-foreground">
        Budget <span className="text-accent drop-shadow-sm">Wallet</span>
      </h1>
      <h2 className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-8 border-b border-card-border pb-6">{isLogin ? 'Secure Access' : 'Initialize Account'}</h2>
      
      <form onSubmit={handleAuth} className="space-y-6 text-left">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="minimal-input p-2 w-full"
            placeholder="portal@secure.com"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Authentication Key</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="minimal-input p-2 w-full"
            placeholder="••••••••"
          />
        </div>
        {message && <p className={`text-sm text-center ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        <button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent-hover text-white dark:text-black py-3 rounded-full font-bold tracking-widest text-xs uppercase transition-all duration-300 shadow-lg shadow-accent/20 mt-4">
          {loading ? 'Authenticating...' : isLogin ? 'Access Wallet' : 'Create Credentials'}
        </button>
      </form>
      <p className="text-[10px] uppercase tracking-widest text-center mt-8 text-gray-500">
        {isLogin ? "No credentials? " : "Existing access? "}
        <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-accent hover:text-accent-hover font-bold ml-1 transition-colors">
          {isLogin ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
}