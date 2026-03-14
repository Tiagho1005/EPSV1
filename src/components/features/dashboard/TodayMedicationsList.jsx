import React from 'react';
import { Pill, Clock, ChevronRight, Check } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { ROUTES } from '../../../utils/constants';
import { formatTime } from '../../../utils/formatters';

const TodayMedicationsList = ({ medications, takenMeds, onMarkTaken, onSeeAll }) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Pill size={20} className="text-primary-500" />
          Medicamentos de Hoy
        </h2>
        <Button 
          variant="link" 
          size="sm" 
          onClick={onSeeAll}
          icon={<ChevronRight size={16} />} 
          iconPosition="right"
        >
          Ver todos
        </Button>
      </div>

      {medications.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">Sin medicamentos para hoy</p>
      ) : (
        <div className="space-y-3">
          {medications.slice(0, 4).map(med => {
            const isTaken = takenMeds[med.key];
            return (
              <div key={med.key}
                className={`flex items-center justify-between p-3 rounded-xl border ${isTaken ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'} transition-all`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isTaken ? 'bg-success text-white' : 'bg-primary-100 text-primary-600'}`}>
                    {isTaken ? <Check size={16} /> : <Clock size={14} />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isTaken ? 'text-green-700 line-through' : 'text-gray-800'}`}>
                      {med.nombre} {med.dosis}
                    </p>
                    <p className="text-xs text-gray-500">{formatTime(med.horario)}</p>
                  </div>
                </div>
                {!isTaken && (
                  <Button variant="ghost" size="sm" onClick={() => onMarkTaken(med.id, med.horario)}>
                    Marcar
                  </Button>
                )}
                {isTaken && (
                  <span className="text-xs text-success font-medium">✓ Tomado</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TodayMedicationsList;
