import React from 'react';
import { BookOpen, Layers, Database, Sparkles } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-slate-800/90 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Bookstore Inventory System</h1>
            <p className="text-sm text-slate-400">Frontend React + Tailwind CSS + Lucide</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center space-x-3">
            <Layers className="text-emerald-400 w-5 h-5" />
            <span className="text-sm font-medium">Arquitectura Modular</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center space-x-3">
            <Database className="text-sky-400 w-5 h-5" />
            <span className="text-sm font-medium">PostgreSQL Conectado</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-700/80 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Docker Frontend Listo
          </span>
          <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-amber-400" /> Bookstore API</span>
        </div>
      </div>
    </div>
  );
}

export default App;
