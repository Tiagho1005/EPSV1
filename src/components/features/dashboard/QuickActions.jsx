import React from 'react';
import { CalendarPlus, Calendar, FileText, Pill } from 'lucide-react';
import Card from '../../ui/Card';
import { ROUTES } from '../../../utils/constants';

const QuickActions = ({ onNavigate }) => {
  const actions = [
    { icon: CalendarPlus, label: 'Agendar Cita', path: ROUTES.NEW_APPOINTMENT, color: 'from-primary-500 to-primary-600' },
    { icon: Calendar, label: 'Mis Citas', path: ROUTES.APPOINTMENTS, color: 'from-secondary-500 to-secondary-600' },
    { icon: FileText, label: 'Historial', path: ROUTES.MEDICAL_HISTORY, color: 'from-indigo-500 to-indigo-600' },
    { icon: Pill, label: 'Medicamentos', path: ROUTES.MEDICATIONS, color: 'from-emerald-500 to-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map(action => (
        <Card
          key={action.path}
          hover
          padding="p-4"
          className="text-center group"
          onClick={() => onNavigate(action.path)}
        >
          <div className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <action.icon size={22} className="text-white" />
          </div>
          <p className="text-sm font-medium text-gray-700">{action.label}</p>
        </Card>
      ))}
    </div>
  );
};

export default QuickActions;
