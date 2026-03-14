import React from 'react';
import { Pill, AlertTriangle } from 'lucide-react';
import Modal from '../../ui/Modal';
import Button from '../../ui/Button';
import { formatTime, formatDate } from '../../../utils/formatters';

const MedicationModals = ({
  confirmModal,
  setConfirmModal,
  confirmLoading,
  handleConfirmTaken,
  renewalModal,
  setRenewalModal,
  renewLoading,
  handleRenewal,
  infoModal,
  setInfoModal
}) => {
  return (
    <>
      {/* Confirm Mark Taken Modal */}
      <Modal
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title="Confirmar dosis"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmModal(null)} disabled={confirmLoading}>Cancelar</Button>
            <Button 
              variant="primary" 
              loading={confirmLoading} 
              onClick={handleConfirmTaken}
              className="gradient-primary border-0"
            >
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
            <p className="text-sm text-gray-600">¿Confirmas que tomaste</p>
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
            <Button 
              variant="primary" 
              loading={renewLoading} 
              onClick={handleRenewal}
              className="gradient-primary border-0"
            >
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
              <p>Tu solicitud será enviada al <strong>{renewalModal.medico}</strong> para su aprobación. Recibirás una notificación cuando sea procesada.</p>
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
    </>
  );
};

export default MedicationModals;
