import React, { useEffect, useState, useCallback } from 'react';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import usePagination from '../hooks/usePagination';

// Feature Components
import MedicationList from '../components/features/medications/MedicationList';
import MedicationModals from '../components/features/medications/MedicationModals';

const TAKEN_CACHE_KEY = 'eps_taken_doses';

const loadTodayCache = () => {
  try {
    const raw = localStorage.getItem(TAKEN_CACHE_KEY);
    if (!raw) return {};
    const { date, data } = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    return date === today ? data : {};
  } catch {
    return {};
  }
};

const saveTodayCache = (map) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(TAKEN_CACHE_KEY, JSON.stringify({ date: today, data: map }));
  } catch {}
};

const MedicationsPage = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takenDoses, setTakenDoses] = useState(loadTodayCache);
  const [confirmModal, setConfirmModal] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [renewalModal, setRenewalModal] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const { showToast } = useToast();

  const pagination = usePagination(medications, 6);

  const syncTakenDoses = useCallback(async () => {
    try {
      const serverMap = await api.getTodayTakenDoses();
      setTakenDoses(prev => {
        const merged = { ...prev, ...serverMap };
        saveTodayCache(merged);
        return merged;
      });
    } catch {
      // Local cache used
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMedications();
        setMedications(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
    syncTakenDoses();
  }, [syncTakenDoses]);

  const handleMarkTaken = (med, horario) => {
    setConfirmModal({ med, horario });
  };

  const handleConfirmTaken = async () => {
    const { med, horario } = confirmModal;
    const key = `${med.id}-${horario}`;
    setConfirmLoading(true);
    try {
      const result = await api.markMedicationTaken(med.id, horario);
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

  const handleRenewal = async () => {
    if (!renewalModal) return;
    setRenewLoading(true);
    try {
      await api.requestRenewal(renewalModal.id);
      showToast({ type: 'success', title: 'Solicitud enviada', message: 'Tu solicitud de renovación ha sido enviada al médico para su aprobación' });
      setRenewalModal(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Medicamentos</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Medicamentos</h1>
        <p className="text-gray-500 text-sm">Gestiona tus medicamentos y registra tus dosis</p>
      </div>

      <MedicationList 
        medications={medications}
        takenDoses={takenDoses}
        onMarkTaken={handleMarkTaken}
        onRenew={setRenewalModal}
        onInfo={setInfoModal}
        pagination={pagination}
      />

      <MedicationModals 
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        confirmLoading={confirmLoading}
        handleConfirmTaken={handleConfirmTaken}
        renewalModal={renewalModal}
        setRenewalModal={setRenewalModal}
        renewLoading={renewLoading}
        handleRenewal={handleRenewal}
        infoModal={infoModal}
        setInfoModal={setInfoModal}
      />
    </div>
  );
};

export default MedicationsPage;

