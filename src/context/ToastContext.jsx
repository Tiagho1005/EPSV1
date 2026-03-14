/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast from '../components/ui/Toast';

const ToastContext = createContext(null);
export { ToastContext };

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  // Mapa de timers activos: id → timeoutId — evita memory leaks al limpiar correctamente
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
  }, []);

  const showToast = useCallback(({ type = 'info', title, message, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        delete timersRef.current[id];
      }, duration);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3" aria-live="polite">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
