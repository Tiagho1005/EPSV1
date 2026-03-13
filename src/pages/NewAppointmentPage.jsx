import React from 'react';
import AppointmentStepper from '../components/features/appointments/AppointmentStepper';

const NewAppointmentPage = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Agendar Cita</h1>
        <p className="text-gray-500 text-sm">Sigue los pasos para agendar tu cita médica</p>
      </div>

      <AppointmentStepper />
    </div>
  );
};

export default NewAppointmentPage;
