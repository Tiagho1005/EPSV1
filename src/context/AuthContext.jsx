import { createContext, useContext, useReducer, useEffect } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import { api } from '../services/api';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
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
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        loginAttempts: 0,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loginAttempts: state.loginAttempts + 1,
        isLoading: false,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'RESTORE_SESSION':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
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
  const [savedSession, setSavedSession, removeSavedSession] = useLocalStorage('eps_session', null);

  useEffect(() => {
    if (savedSession?.user && savedSession?.token) {
      dispatch({ type: 'RESTORE_SESSION', payload: savedSession });
    } else {
      dispatch({ type: 'INIT_COMPLETE' });
    }
  }, []);

  const login = async (cedula, password) => {
    try {
      const result = await api.login(cedula, password);
      const session = { user: result.user, token: result.token };
      setSavedSession(session);
      dispatch({ type: 'LOGIN_SUCCESS', payload: session });
      return result;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = () => {
    removeSavedSession();
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
    if (savedSession) {
      setSavedSession({
        ...savedSession,
        user: { ...savedSession.user, ...userData },
      });
    }
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

export default AuthContext;
