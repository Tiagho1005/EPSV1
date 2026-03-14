import React from 'react';
import { Calendar, Stethoscope, ChevronRight } from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { formatDateShort } from '../../../utils/formatters';
import { STATE_VARIANTS, STATE_LABELS } from '../../../utils/constants';

const RecentActivityList = ({ appointments, onSeeAll }) => {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Calendar size={20} className="text-secondary-500" />
          Actividad Reciente
        </h2>
        <Button 
          variant="link" 
          size="sm" 
          onClick={onSeeAll}
          icon={<ChevronRight size={16} />} 
          iconPosition="right"
        >
          Ver todas
        </Button>
      </div>

      {appointments.length === 0 ? (
        <p className="text-gray-400 text-sm py-4 text-center">Sin actividad reciente</p>
      ) : (
        <div className="space-y-3">
          {appointments.map(apt => (
            <div key={apt.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center">
                <Stethoscope size={16} className="text-secondary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{apt.especialidadNombre}</p>
                <p className="text-xs text-gray-500">{apt.medico} • {formatDateShort(apt.fecha)}</p>
              </div>
              <Badge variant={STATE_VARIANTS[apt.estado]} className="text-[10px]">
                {STATE_LABELS[apt.estado]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RecentActivityList;
