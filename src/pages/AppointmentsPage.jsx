import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import Button from '../components/ui/Button';
import AppointmentList from '../components/features/appointments/AppointmentList';
import { ROUTES } from '../utils/constants';

const AppointmentsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mis Citas</h1>
          <p className="text-gray-500 text-sm">Gestiona tus citas médicas</p>
        </div>
        <Button
          icon={<CalendarPlus size={18} />}
          onClick={() => navigate(ROUTES.NEW_APPOINTMENT)}
          className="gradient-primary border-0"
        >
          Agendar Cita
        </Button>
      </div>

      <AppointmentList />
    </div>
  );
};

export default AppointmentsPage;
