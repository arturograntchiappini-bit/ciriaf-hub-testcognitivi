import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { activeBackend, initEngine } from './engine/backend';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Elemento #root non trovato in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


// Il motore Rust/WebAssembly si carica a interfaccia già disegnata; finché non è pronto vale il TypeScript.
const startEngine = (): void =>
  void initEngine().then(() => {
    document.documentElement.dataset.engine = activeBackend();
  });
if ('requestIdleCallback' in window) window.requestIdleCallback(startEngine);
else globalThis.setTimeout(startEngine, 200);
