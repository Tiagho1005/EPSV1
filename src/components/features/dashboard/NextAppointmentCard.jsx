import React from 'react';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { Calendar, Clock, MapPin, User, Stethoscope } from 'lucide-react';
import { formatDateShort, formatTime } from '../../../utils/formatters';
import { STATE_VARIANTS, STATE_LABELS } from '../../../utils/constants';

const NextAppointmentCard = ({ appointment, onDetailClick }) => {
  if (!appointment) return null;

  return (
    <Card className="gradient-primary text-white relative overflow-hidden" hover>
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative">
        <p className="text-white/80 text-sm font-medium mb-2">📅 Próxima Cita</p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Stethoscope size={20} />
              {appointment.especialidadNombre}
            </h3>
            <p className="text-white/90 flex items-center gap-2 mt-1">
              <User size={16} /> {appointment.medico}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1.5 text-white/90">
                <Calendar size={14} />
                {formatDateShort(appointment.fecha)}
              </span>
              <span className="flex items-center gap-1.5 text-white/90">
                <Clock size={14} />
                {formatTime(appointment.hora)}
              </span>
              <span className="flex items-center gap-1.5 text-white/90">
                <MapPin size={14} />
                {appointment.sede}
              </span>
            </div>
          </div>
          <Badge variant={STATE_VARIANTS[appointment.estado]} dot>
            {STATE_LABELS[appointment.estado]}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-white/20 border border-white/30"
            onClick={onDetailClick}
          >
            Ver detalles
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default NextAppointmentCard;
