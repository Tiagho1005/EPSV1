import { useEffect, useRef, useCallback } from 'react';
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from '../utils/constants';

/**
 * Tracks user inactivity and calls onWarning after SESSION_WARNING_MS
 * and onTimeout after SESSION_TIMEOUT_MS.
 * Resets on any user interaction (click, keydown, mousemove, touchstart).
 */
const useSessionTimeout = ({ onWarning, onTimeout, enabled = true }) => {
  const warningTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
  }, []);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    warningTimerRef.current = setTimeout(onWarning, SESSION_WARNING_MS);
    timeoutTimerRef.current = setTimeout(onTimeout, SESSION_TIMEOUT_MS);
  }, [enabled, onWarning, onTimeout, clearTimers]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimers, { passive: true }));
    resetTimers();

    return () => {
      clearTimers();
      events.forEach(e => window.removeEventListener(e, resetTimers));
    };
  }, [enabled, resetTimers, clearTimers]);

  return { resetTimers };
};

export default useSessionTimeout;
