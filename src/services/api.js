// ============================================================
//  Singleton de la API para uso en la aplicación.
//
//  El JWT viaja en una cookie httpOnly gestionada por el
//  navegador — este módulo no conoce ni necesita el token.
//
//  Para tests: instancia ApiClient directamente:
//    new ApiClient({ baseURL: 'http://localhost:3001/api' })
// ============================================================
import { ApiClient } from './ApiClient';

export const api = new ApiClient({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});
