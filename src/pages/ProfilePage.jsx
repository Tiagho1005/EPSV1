import React, { useRef, useState } from 'react';
import { IdCard, Camera, FileDown, Download, Loader2, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProfileForm from '../components/features/profile/ProfileForm';
import ChangePasswordForm from '../components/features/profile/ChangePasswordForm';
import { formatDate, getInitials } from '../utils/formatters';
import { api } from '../services/api';
import { generateAffiliationCertificate, generateMedicalHistoryPDF } from '../utils/pdfGenerator';

const ADVANCE_OPTIONS = [
  { value: 5,  label: '5 minutos' },
  { value: 10, label: '10 minutos' },
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
];

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [uploadingPic, setUploadingPic] = useState(false);
  const [downloadingHistory, setDownloadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  const [reminderPrefs, setReminderPrefs] = useState(() => ({
    emailEnabled: user?.reminderPreferences?.email_enabled ?? true,
    advanceMinutes: user?.reminderPreferences?.advance_minutes ?? 15,
  }));
  const [savingReminders, setSavingReminders] = useState(false);

  const handleReminderChange = async (patch) => {
    const next = { ...reminderPrefs, ...patch };
    setReminderPrefs(next);
    setSavingReminders(true);
    try {
      await api.updateReminderPreferences({ emailEnabled: next.emailEnabled, advanceMinutes: next.advanceMinutes });
      showToast({ type: 'success', title: 'Preferencias guardadas', message: 'Configuración de recordatorios actualizada' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
      setReminderPrefs(reminderPrefs); // revert
    } finally {
      setSavingReminders(false);
    }
  };

  const handleDownloadCertificate = () => {
    try {
      generateAffiliationCertificate(user);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo generar el certificado' });
    }
  };

  const handleDownloadHistory = async () => {
    setDownloadingHistory(true);
    try {
      const history = await api.getMedicalHistory();
      generateMedicalHistoryPDF(user, history);
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo generar el historial' });
    } finally {
      setDownloadingHistory(false);
    }
  };

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

      {/* Reminders */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Recordatorios</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Recibe un email antes de cada dosis programada de tus medicamentos activos</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recordatorios de medicamentos por email</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {reminderPrefs.emailEnabled ? 'Activado — recibirás un email antes de cada dosis' : 'Desactivado'}
              </p>
            </div>
            <button
              type="button"
              disabled={savingReminders}
              onClick={() => handleReminderChange({ emailEnabled: !reminderPrefs.emailEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer disabled:opacity-50 ${
                reminderPrefs.emailEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                  reminderPrefs.emailEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Advance minutes select */}
          {reminderPrefs.emailEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Anticipación del recordatorio
              </label>
              <select
                value={reminderPrefs.advanceMinutes}
                disabled={savingReminders}
                onChange={e => handleReminderChange({ advanceMinutes: Number(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white dark:bg-gray-800 dark:text-gray-100 cursor-pointer disabled:opacity-50"
              >
                {ADVANCE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label} antes</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* Documents */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <FileDown size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">Documentos</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Descarga tus documentos oficiales en PDF</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            icon={<Download size={16} />}
            onClick={handleDownloadCertificate}
            className="flex-1"
          >
            Certificado de Afiliación
          </Button>

          <Button
            variant="outline"
            icon={downloadingHistory ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            onClick={handleDownloadHistory}
            disabled={downloadingHistory}
            className="flex-1"
          >
            {downloadingHistory ? 'Generando...' : 'Historial Médico'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProfilePage;
