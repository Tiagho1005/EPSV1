import React from 'react';
import Skeleton from '../components/ui/Skeleton';
import { Bell } from 'lucide-react';
import usePagination from '../hooks/usePagination';
import { useMedications } from '../hooks/useMedications';
import MedicationList from '../components/features/medications/MedicationList';
import MedicationModals from '../components/features/medications/MedicationModals';

const MedicationsPage = () => {
  const {
    medications, loading, upcomingDoses, takenDoses,
    confirmModal,  setConfirmModal,  confirmLoading,
    renewalModal,  setRenewalModal,  renewLoading,
    infoModal,     setInfoModal,
    handleMarkTaken,
    handleConfirmTaken,
    handleRenewal,
  } = useMedications();

  const pagination = usePagination(medications, 6);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Medicamentos</h1>
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

      {upcomingDoses.length > 0 && (
        <div className="space-y-2">
          {upcomingDoses.map(({ med, horario, minutesLeft }) => (
            <div
              key={`${med.id}-${horario}`}
              className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400"
            >
              <Bell size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  ¡Próxima dosis en {minutesLeft} minuto{minutesLeft !== 1 ? 's' : ''}!
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  {med.nombre} {med.dosis} — programado a las {horario}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

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
