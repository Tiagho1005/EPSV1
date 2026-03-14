import React from 'react';
import { FileText, Calendar, User, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import Badge from '../../ui/Badge';
import { formatDateFull } from '../../../utils/formatters';

const MedicalHistoryCard = ({ item }) => {
  return (
    <div className="relative pl-8 pb-8 last:pb-0 group">
      {/* Timeline Line */}
      <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-gray-100 group-last:hidden" />
      
      {/* Timeline Dot */}
      <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white bg-primary-500 shadow-sm z-10 
        group-hover:scale-125 transition-transform duration-300" />
      
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-all duration-300">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <FileText size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{item.especialidad}</h3>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Calendar size={14} /> {formatDateFull(item.fecha)}
              </p>
            </div>
          </div>
          <Badge variant="success" icon={<CheckCircle2 size={12} />}>
            Completada
          </Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Médico</p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <User size={14} className="text-gray-400" /> {item.medico}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Sede</p>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" /> {item.sede}
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl mb-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Diagnóstico / Observaciones</p>
          <p className="text-sm text-gray-600 italic">"{item.diagnostico}"</p>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-2">
            Ver resultados <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryCard;
