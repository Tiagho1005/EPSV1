import React from 'react';
import MedicationCard from './MedicationCard';
import Pagination from '../../ui/Pagination';
import EmptyState from '../../ui/EmptyState';

const MedicationList = ({ 
  medications, 
  takenDoses, 
  onMarkTaken, 
  onRenew, 
  onInfo, 
  pagination 
}) => {
  if (medications.length === 0) {
    return (
      <EmptyState
        icon="Pill"
        title="Sin medicamentos activos"
        description="No tienes medicamentos asignados actualmente"
      />
    );
  }

  return (
    <div className="space-y-4">
      {pagination.paginated.map(med => (
        <MedicationCard
          key={med.id}
          med={med}
          takenDoses={takenDoses}
          onMarkTaken={onMarkTaken}
          onRenew={onRenew}
          onInfo={onInfo}
        />
      ))}
      <Pagination {...pagination} />
    </div>
  );
};

export default MedicationList;
