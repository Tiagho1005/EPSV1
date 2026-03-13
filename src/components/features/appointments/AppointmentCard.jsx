import React from 'react';
import { Calendar, Stethoscope, User, MapPin, Clock, CalendarClock } from 'lucide-react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { STATE_VARIANTS, STATE_LABELS } from '../../../utils/constants';
import { formatDateShort, formatTime } from '../../../utils/formatters';

const AppointmentCard = ({ apt, onDetail, onReschedule, onCancel, canReschedule, canModify }) => {
  return (
    <Card hover className="group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl gradient-card flex items-center justify-center flex-shrink-0">
            <Stethoscope size={22} className="text-primary-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-800">{apt.especialidadNombre}</h3>
              <Badge variant={STATE_VARIANTS[apt.estado]} dot>
                {STATE_LABELS[apt.estado]}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <User size={14} /> {apt.medico}
            </p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {formatDateShort(apt.fecha)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatTime(apt.hora)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {apt.sede}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onDetail(apt)}>
            Ver detalles
          </Button>
          {canReschedule(apt) && (
            <Button variant="outline" size="sm" className="text-primary-600 border-primary-200 hover:bg-primary-50"
              icon={<CalendarClock size={15} />}
              onClick={() => onReschedule(apt)}>
              Reagendar
            </Button>
          )}
          {canModify(apt) && (
            <Button variant="outline" size="sm" className="text-error border-error/30 hover:bg-error-light"
              onClick={() => onCancel(apt)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentCard;
