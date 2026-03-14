import React, { useRef, useState } from 'react';
import { IdCard, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import ProfileForm from '../components/features/profile/ProfileForm';
import ChangePasswordForm from '../components/features/profile/ChangePasswordForm';
import { formatDate, getInitials } from '../utils/formatters';
import { api } from '../services/api';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef(null);

  /** Redimensiona y comprime la imagen a 200×200 JPEG al 80% de calidad */
  const compressImage = (dataUrl) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        // Recortar al centro para mantener proporción cuadrada
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });

  const handlePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', title: 'Formato inválido', message: 'Solo se permiten imágenes (JPG, PNG, etc.)' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast({ type: 'error', title: 'Archivo muy grande', message: 'La imagen no puede superar 5 MB' });
      return;
    }
    setUploadingPic(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const compressed = await compressImage(ev.target.result);
        await api.updateProfile({ fotoUrl: compressed });
        updateUser({ foto: compressed });
        showToast({ type: 'success', title: 'Foto actualizada', message: 'Tu foto de perfil fue actualizada correctamente' });
      } catch (err) {
        showToast({ type: 'error', title: 'Error', message: err.message });
      } finally {
        setUploadingPic(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
        <p className="text-gray-500 text-sm">Administra tu información personal</p>
      </div>

      {/* Profile card */}
      <Card className="text-center overflow-hidden">
        <div className="h-24 gradient-primary rounded-t-2xl -mx-6 -mt-6 mb-0 relative" />
        <div className="relative -mt-12 mb-4 w-24 mx-auto">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-2xl font-bold text-white shadow-lg border-4 border-white overflow-hidden">
            {user?.foto
              ? <img src={user.foto} alt="Foto de perfil" className="w-full h-full object-cover" />
              : getInitials(user?.nombreCompleto)
            }
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPic}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            title="Cambiar foto"
          >
            {uploadingPic
              ? <span className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              : <Camera size={14} className="text-gray-600" />
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePicChange}
          />
        </div>
        <h2 className="text-xl font-bold text-gray-800">{user?.nombreCompleto}</h2>
        <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-1">
          <IdCard size={14} /> CC {user?.cedula}
        </p>
        <p className="text-xs text-gray-400 mt-1">Afiliado desde {formatDate(user?.fechaRegistro)}</p>
      </Card>

      <ProfileForm user={user} updateUser={updateUser} showToast={showToast} />

      <ChangePasswordForm showToast={showToast} />
    </div>
  );
};

export default ProfilePage;
