import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { loadTodayCache, saveTodayCache, getUpcomingDoses } from '../utils/medicationUtils';

/**
 * Encapsula toda la lógica de medicamentos:
 * carga de datos, sincronización de dosis, registro de toma y renovación.
 */
export const useMedications = () => {
  const { showToast }       = useToast();
  const { addNotification } = useNotifications();

  const [medications, setMedications]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [upcomingDoses, setUpcomingDoses] = useState([]);
  const [takenDoses, setTakenDoses]       = useState(loadTodayCache);

  // Modales
  const [confirmModal, setConfirmModal]   = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [renewalModal, setRenewalModal]   = useState(null);
  const [renewLoading, setRenewLoading]   = useState(false);
  const [infoModal, setInfoModal]         = useState(null);

  const intervalRef = useRef(null);

  // ── Sincronización de dosis con el servidor ───────────────────

  const syncTakenDoses = useCallback(async () => {
    try {
      const serverMap = await api.getTodayTakenDoses();
      setTakenDoses(prev => {
        const merged = { ...prev, ...serverMap };
        saveTodayCache(merged);
        return merged;
      });
    } catch {
      // Mantiene caché local si falla la sincronización
    }
  }, []);

  // ── Carga inicial ─────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMedications();
        setMedications(data);
        setUpcomingDoses(getUpcomingDoses(data));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    syncTakenDoses();
  }, [syncTakenDoses]);

  // ── Actualización periódica de dosis próximas (cada minuto) ───

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setMedications(prev => {
        setUpcomingDoses(getUpcomingDoses(prev));
        return prev;
      });
    }, 60_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Registro de toma ──────────────────────────────────────────

  const handleMarkTaken = (med, horario) => {
    setConfirmModal({ med, horario });
  };

  const handleConfirmTaken = async () => {
    const { med, horario } = confirmModal;
    const key = `${med.id}-${horario}`;
    setConfirmLoading(true);
    try {
      const result    = await api.markMedicationTaken(med.id, horario);
      const timestamp = result.timestamp || new Date().toISOString();
      const formatted = new Date(timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      setTakenDoses(prev => {
        const updated = { ...prev, [key]: formatted };
        saveTodayCache(updated);
        return updated;
      });
      showToast({ type: 'success', title: '✓ Dosis registrada', message: 'Dosis registrada correctamente' });
      setConfirmModal(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Solicitud de renovación ───────────────────────────────────

  const handleRenewal = async () => {
    if (!renewalModal) return;
    setRenewLoading(true);
    try {
      await api.requestRenewal(renewalModal.id);
      showToast({
        type: 'success',
        title: 'Solicitud enviada',
        message: 'Tu solicitud de renovación ha sido enviada al médico para su aprobación',
      });
      addNotification({
        title:   'Solicitud de renovación enviada',
        message: `La solicitud de renovación de ${renewalModal?.nombre || 'medicamento'} fue enviada al médico`,
        type:    'info',
      });
      setRenewalModal(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setRenewLoading(false);
    }
  };

  return {
    // Data
    medications,
    loading,
    upcomingDoses,
    takenDoses,
    // Modales
    confirmModal,  setConfirmModal,  confirmLoading,
    renewalModal,  setRenewalModal,  renewLoading,
    infoModal,     setInfoModal,
    // Handlers
    handleMarkTaken,
    handleConfirmTaken,
    handleRenewal,
  };
};
