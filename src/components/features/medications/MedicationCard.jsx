import React from 'react';
import { Pill, User, Info, RefreshCw } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import MedicationReminder from './MedicationReminder';
import { getDaysRemaining } from '../../../utils/formatters';

const MedicationCard = ({ med, takenDoses, onMarkTaken, onRenew, onInfo }) => {
  const daysLeft = getDaysRemaining(med.fechaFin);

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

  return (
    <Card className="overflow-hidden">
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
            onClick={() => onInfo(med)}
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
          return (
            <MedicationReminder
              key={h}
              med={med}
              horario={h}
              takenTime={takenDoses[key]}
              onMarkTaken={onMarkTaken}
            />
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
            onClick={() => onRenew(med)}
            className="text-primary-600 border-primary-200 hover:bg-primary-50"
          >
            Solicitar Renovación
          </Button>
        </div>
      )}
    </Card>
  );
};

export default MedicationCard;
