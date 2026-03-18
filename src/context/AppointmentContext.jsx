/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
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

  const savedRef = useRef(savedAppointments);
  const appointmentsRef = useRef(state.appointments);
  const setSavedRef = useRef(setSavedAppointments);

  useEffect(() => { savedRef.current = savedAppointments; }, [savedAppointments]);
  useEffect(() => { appointmentsRef.current = state.appointments; }, [state.appointments]);
  useEffect(() => { setSavedRef.current = setSavedAppointments; }, [setSavedAppointments]);

  const fetchAppointments = useCallback(async () => {
    if (savedRef.current) {
      dispatch({ type: 'SET_APPOINTMENTS', payload: savedRef.current });
    } else {
      dispatch({ type: 'SET_LOADING' });
    }
    try {
      const data = await api.getAppointments();
      dispatch({ type: 'SET_APPOINTMENTS', payload: data });
      setSavedRef.current(data);
    } catch (error) {
      if (!savedRef.current) dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  }, [dispatch]);

  const createAppointment = useCallback(async (appointmentData) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      const newAppointment = await api.createAppointment(appointmentData);
      dispatch({ type: 'ADD_APPOINTMENT', payload: newAppointment });
      const updated = [newAppointment, ...appointmentsRef.current];
      setSavedRef.current(updated);
      return newAppointment;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const cancelAppointment = useCallback(async (id, motivo) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await api.cancelAppointment(id, motivo);
      const update = { id, estado: 'cancelada', motivoCancelacion: motivo };
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: update });
      const updated = appointmentsRef.current.map(a =>
        a.id === id ? { ...a, ...update } : a
      );
      setSavedRef.current(updated);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const rescheduleAppointment = useCallback(async (id, newDate, newTime) => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await api.rescheduleAppointment(id, newDate, newTime);
      const apt = appointmentsRef.current.find(a => a.id === id);
      const update = {
        id,
        fecha: newDate,
        hora: newTime,
        reagendamientos: (apt?.reagendamientos || 0) + 1,
      };
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: update });
      const updated = appointmentsRef.current.map(a =>
        a.id === id ? { ...a, ...update } : a
      );
      setSavedRef.current(updated);
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [dispatch]);

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

