import React, { useEffect, useState } from 'react';
import { Pill, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import MedicationCard from '../components/features/medications/MedicationCard';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatTime, formatDate } from '../utils/formatters';

const MedicationsPage = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [takenDoses, setTakenDoses] = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // { med, horario }
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [renewalModal, setRenewalModal] = useState(null);
  const [renewLoading, setRenewLoading] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const { showToast } = useToast();

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
  }, []);

  const handleMarkTaken = (med, horario) => {
    setConfirmModal({ med, horario });
  };

  const handleConfirmTaken = async () => {
    const { med, horario } = confirmModal;
    const key = `${med.id}-${horario}`;
    setConfirmLoading(true);
    try {
      await api.markMedicationTaken(med.id, horario);
      setTakenDoses(prev => ({ ...prev, [key]: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) }));
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
      showToast({ type: 'success', title: 'Solicitud enviada', message: 'Tu solicitud de renovación ha sido procesada' });
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

      {medications.length === 0 ? (
        <EmptyState
          icon="Pill"
          title="Sin medicamentos activos"
          description="No tienes medicamentos asignados actualmente"
        />
      ) : (
        <div className="space-y-4">
          {medications.map(med => (
            <MedicationCard
              key={med.id}
              med={med}
              takenDoses={takenDoses}
              onMarkTaken={handleMarkTaken}
              onRenew={setRenewalModal}
              onInfo={setInfoModal}
            />
          ))}
        </div>
      )}

      {/* Confirm Mark Taken Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="Confirmar dosis"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
            <Button variant="primary" loading={confirmLoading} onClick={handleConfirmTaken}
              className="gradient-primary border-0">
              Confirmar
            </Button>
          </>
        }
      >
        {confirmModal && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-lg">
              <Pill size={26} className="text-white" />
            </div>
            <p className="text-sm text-gray-600">
              ¿Confirmas que tomaste
            </p>
            <p className="font-semibold text-gray-800">
              {confirmModal.med.nombre} {confirmModal.med.dosis}
            </p>
            <p className="text-sm text-gray-500">
              Horario: <span className="font-medium">{formatTime(confirmModal.horario)}</span>
            </p>
          </div>
        )}
      </Modal>

      {/* Renewal Modal */}
      <Modal
        isOpen={!!renewalModal}
        onClose={() => setRenewalModal(null)}
        title="Solicitar Renovación"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenewalModal(null)}>Cancelar</Button>
            <Button variant="primary" loading={renewLoading} onClick={handleRenewal}
              className="gradient-primary border-0">
              Confirmar Solicitud
            </Button>
          </>
        }
      >
        {renewalModal && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              ¿Deseas solicitar la renovación de la receta de <strong>{renewalModal.nombre} {renewalModal.dosis}</strong>?
            </p>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
              <p>Tu solicitud será enviada al <strong>{renewalModal.medico}</strong> para su aprobación.</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Info Modal */}
      <Modal
        isOpen={!!infoModal}
        onClose={() => setInfoModal(null)}
        title="Información del Medicamento"
        size="md"
      >
        {infoModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Medicamento</p>
                <p className="text-sm font-medium">{infoModal.nombre} {infoModal.dosis}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Presentación</p>
                <p className="text-sm font-medium">{infoModal.presentacion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Frecuencia</p>
                <p className="text-sm font-medium">{infoModal.frecuencia}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prescrito por</p>
                <p className="text-sm font-medium">{infoModal.medico}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fecha inicio</p>
                <p className="text-sm font-medium">{formatDate(infoModal.fechaInicio)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Fecha fin</p>
                <p className="text-sm font-medium">{formatDate(infoModal.fechaFin)}</p>
              </div>
            </div>
            {infoModal.instrucciones && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle size={12} /> Instrucciones
                </p>
                <p className="text-sm text-amber-800">{infoModal.instrucciones}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MedicationsPage;
