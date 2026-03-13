import React, { useEffect, useState } from 'react';
import {
  Pill, Clock, Check, AlertTriangle, RefreshCw, Calendar,
  User, ChevronRight, Info
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatTime, formatDate, getDaysRemaining } from '../utils/formatters';

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

  const getDaysColor = (days) => {
    if (days > 7) return 'text-success';
    if (days > 3) return 'text-warning';
    return 'text-error';
  };

  const getDaysBg = (days) => {
    if (days > 7) return 'bg-green-50 border-green-200';
    if (days > 3) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
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
          {medications.map(med => {
            const daysLeft = getDaysRemaining(med.fechaFin);
            return (
              <Card key={med.id} className="overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
                      <Pill size={22} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{med.nombre} {med.dosis}</h3>
                      <p className="text-sm text-gray-500">{med.presentacion} • {med.frecuencia}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${getDaysBg(daysLeft)} ${getDaysColor(daysLeft)}`}>
                      {daysLeft} días restantes
                    </div>
                    <button
                      onClick={() => setInfoModal(med)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                      <Info size={18} />
                    </button>
                  </div>
                </div>

                {/* Prescribed by */}
                <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                  <User size={12} /> Prescrito por {med.medico}
                </p>

                {/* Schedule */}
                <div className="space-y-2">
                  {med.horarios.map(h => {
                    const key = `${med.id}-${h}`;
                    const taken = takenDoses[key];
                    return (
                      <div
                        key={h}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          taken ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            taken ? 'bg-success text-white' : 'bg-white border border-gray-200 text-gray-500'
                          }`}>
                            {taken ? <Check size={16} /> : <Clock size={14} />}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${taken ? 'text-green-700' : 'text-gray-700'}`}>
                              {formatTime(h)}
                            </p>
                            {taken && <p className="text-xs text-green-500">Tomado a las {taken}</p>}
                          </div>
                        </div>
                        {!taken ? (
                          <Button variant="primary" size="sm" onClick={() => handleMarkTaken(med, h)}>
                            Marcar tomado
                          </Button>
                        ) : (
                          <Badge variant="success" dot>Tomado</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Renewal button */}
                {med.renovable && daysLeft <= 7 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<RefreshCw size={16} />}
                      onClick={() => setRenewalModal(med)}
                      className="text-primary-600 border-primary-200 hover:bg-primary-50"
                    >
                      Solicitar Renovación
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
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
