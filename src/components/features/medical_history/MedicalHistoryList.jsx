import React from 'react';
import MedicalHistoryCard from './MedicalHistoryCard';
import EmptyState from '../../ui/EmptyState';

const MedicalHistoryList = ({ history }) => {
  if (history.length === 0) {
    return (
      <EmptyState
        icon="FileText"
        title="No se encontraron resultados"
        description="Prueba con otros términos de búsqueda o filtros"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {history.map((item) => (
        <MedicalHistoryCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default MedicalHistoryList;
