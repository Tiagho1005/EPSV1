import React from 'react';
import { Clock, Check } from 'lucide-react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { formatTime } from '../../../utils/formatters';

const MedicationReminder = ({ med, horario, takenTime, onMarkTaken }) => {
  const taken = !!takenTime;
  
  return (
    <div
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
            {formatTime(horario)}
          </p>
          {taken && <p className="text-xs text-green-500">Tomado a las {takenTime}</p>}
        </div>
      </div>
      {!taken ? (
        <Button variant="primary" size="sm" onClick={() => onMarkTaken(med, horario)}>
          Marcar tomado
        </Button>
      ) : (
        <Badge variant="success" dot>Tomado</Badge>
      )}
    </div>
  );
};

export default MedicationReminder;
