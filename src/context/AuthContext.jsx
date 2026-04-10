/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
export { AuthContext };

// El token JWT vive en una cookie httpOnly — el frontend nunca lo ve.
// El estado de la app solo guarda los datos del usuario (sin token).
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  loginAttempts: 0,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        loginAttempts: 0,
      };
    case 'LOGIN_FAILURE':
      return { ...state, loginAttempts: state.loginAttempts + 1, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'INIT_COMPLETE':
      return { ...state, isLoading: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Al montar la app, verificar si existe una sesión activa consultando
  // el backend. La cookie httpOnly se envía automáticamente — el cliente
  // nunca manipula el JWT.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { user } = await api.getMe();
        dispatch({ type: 'RESTORE_SESSION', payload: { user } });
      } catch {
        // Cookie ausente, expirada o en blacklist → sin sesión activa
        dispatch({ type: 'INIT_COMPLETE' });
      }
    };
    restoreSession();
  }, []);

  const login = async (cedula, password) => {
    try {
      // El backend establece la cookie httpOnly en la respuesta.
      // La respuesta solo incluye { success, user } — nunca el token.
      const result = await api.login(cedula, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user: result.user } });
      return result;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = async () => {
    // El backend invalida el JTI en la blacklist y borra la cookie.
    await api.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    // Actualización optimista del estado en memoria.
    // La fuente de verdad es la BD; el próximo /me devolverá datos frescos.
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
