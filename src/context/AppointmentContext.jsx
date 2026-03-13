/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer } from 'react';
import { api } from '../services/api';
import useLocalStorage from '../hooks/useLocalStorage';

const AppointmentContext = createContext(null);
export { AppointmentContext };

const initialState = {
  appointments: [],
  isLoading: false,
  error: null,
};

const appointmentReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SET_APPOINTMENTS':
      return { ...state, appointments: action.payload, isLoading: false };
    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [action.payload, ...state.appointments], isLoading: false };
    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        ),
        isLoading: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
};

export const AppointmentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appointmentReducer, initialState);
  const [savedAppointments, setSavedAppointments] = useLocalStorage('eps_appointments', null);

  const fetchAppointments = async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const data = savedAppointments || await api.getAppointments();
      dispatch({ type: 'SET_APPOINTMENTS', payload: data });
      if (!savedAppointments) setSavedAppointments(data);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  const createAppointment = async (appointmentData) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const newAppointment = await api.createAppointment(appointmentData);
      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
      const updated = [newAppointment, ...state.appointments];
      setSavedAppointments(updated);
      return newAppointment;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const cancelAppointment = async (id, motivo) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await api.cancelAppointment(id, motivo);
      const update = { id, estado: 'cancelada', motivoCancelacion: motivo };
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: update });
      const updated = state.appointments.map(a =>
        a.id === id ? { ...a, ...update } : a
      );
      setSavedAppointments(updated);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const rescheduleAppointment = async (id, newDate, newTime) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await api.rescheduleAppointment(id, newDate, newTime);
      const apt = state.appointments.find(a => a.id === id);
      const update = {
        id,
        fecha: newDate,
        hora: newTime,
        reagendamientos: (apt?.reagendamientos || 0) + 1,
      };
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: update });
      const updated = state.appointments.map(a =>
        a.id === id ? { ...a, ...update } : a
      );
      setSavedAppointments(updated);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  return (
    <AppointmentContext.Provider
      value={{
        ...state,
        fetchAppointments,
        createAppointment,
        cancelAppointment,
        rescheduleAppointment,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
};

export const useAppointments = () => {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error('useAppointments must be used within AppointmentProvider');
  return context;
};

