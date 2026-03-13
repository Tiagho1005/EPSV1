import React, { useState, useRef } from 'react';
import {
  User, IdCard, Phone, Mail, MapPin, Calendar, Lock,
  Camera, Edit3, Save, X, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import useForm from '../hooks/useForm';
import { validators } from '../utils/validators';
import { departments } from '../data/departments';
import { formatDate, getInitials } from '../utils/formatters';
import { api } from '../services/api';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef(null);

  const handlePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', title: 'Formato inválido', message: 'Solo se permiten imágenes (JPG, PNG, etc.)' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', title: 'Archivo muy grande', message: 'La imagen no puede superar 2 MB' });
      return;
    }
    setUploadingPic(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target.result;
        await api.updateProfile({ foto: dataUrl });
        updateUser({ foto: dataUrl });
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

  const { values, errors, touched, handleChange, handleBlur, setFieldValue, resetForm } = useForm(
    {
      nombreCompleto: user?.nombreCompleto || '',
      celular: user?.celular || '',
      email: user?.email || '',
      departamento: user?.departamento || '',
      municipio: user?.municipio || '',
      direccion: user?.direccion || '',
    },
    {
      nombreCompleto: [validators.required, validators.nombreCompleto],
      celular: [validators.required, validators.celular],
      email: [validators.required, validators.email],
      departamento: [validators.required],
      municipio: [validators.required],
      direccion: [validators.required, validators.direccion],
    }
  );

  const passwordForm = useForm(
    { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    {
      currentPassword: [validators.required],
      newPassword: [validators.required, validators.password],
      confirmNewPassword: [validators.required, (val, vals) => validators.passwordMatch(val, vals?.newPassword)],
    }
  );

  const selectedDept = departments.find(d => d.nombre === values.departamento);
  const municipios = selectedDept?.municipios || [];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile(values);
      updateUser(values);
      setIsEditing(false);
      showToast({ type: 'success', title: '¡Actualizado!', message: 'Tus datos han sido actualizados correctamente' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const isValid = passwordForm.validateAll();
    if (!isValid) return;
    setChangingPassword(true);
    try {
      await api.changePassword(passwordForm.values.currentPassword, passwordForm.values.newPassword);
      setShowPasswordModal(false);
      passwordForm.resetForm();
      showToast({
        type: 'success',
        title: 'Contraseña actualizada',
        message: 'Tu contraseña ha sido actualizada. Por seguridad, hemos cerrado otras sesiones',
      });
    } catch (err) {
      passwordForm.setFieldError('currentPassword', err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const InfoRow = ({ icon: Icon, label, value, locked = false }) => (
    <div className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-primary-500" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
      </div>
      {locked && <Lock size={14} className="text-gray-300 mt-2" />}
    </div>
  );

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

      {/* Personal information */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Información Personal</h3>
          {!isEditing ? (
            <Button variant="ghost" size="sm" icon={<Edit3 size={16} />} onClick={() => setIsEditing(true)}>
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<X size={16} />} onClick={handleCancel}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" icon={<Save size={16} />} loading={saving} onClick={handleSave}>
                Guardar
              </Button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="divide-y divide-gray-50">
            <InfoRow icon={User} label="Nombre Completo" value={user?.nombreCompleto} />
            <InfoRow icon={IdCard} label="Cédula" value={user?.cedula} locked />
            <InfoRow icon={Calendar} label="Fecha de Nacimiento" value={formatDate(user?.fechaNacimiento)} locked />
            <InfoRow icon={Phone} label="Celular" value={user?.celular} />
            <InfoRow icon={Mail} label="Correo Electrónico" value={user?.email} />
            <InfoRow icon={MapPin} label="Departamento" value={user?.departamento} />
            <InfoRow icon={MapPin} label="Municipio" value={user?.municipio} />
            <InfoRow icon={MapPin} label="Dirección" value={user?.direccion} />
          </div>
        ) : (
          <div className="space-y-0 animate-fade-in">
            <Input label="Nombre Completo" name="nombreCompleto" value={values.nombreCompleto} onChange={handleChange} onBlur={handleBlur} error={errors.nombreCompleto} touched={touched.nombreCompleto} required icon={<User size={18} />} />

            <div className="py-3 px-4 bg-gray-50 rounded-xl mb-4 flex items-center gap-3">
              <IdCard size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Cédula (no editable)</p>
                <p className="text-sm font-medium text-gray-600">{user?.cedula}</p>
              </div>
              <Lock size={14} className="text-gray-300 ml-auto" />
            </div>

            <Input label="Celular" name="celular" value={values.celular} onChange={handleChange} onBlur={handleBlur} error={errors.celular} touched={touched.celular} required icon={<Phone size={18} />} />
            <Input label="Correo Electrónico" name="email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} touched={touched.email} required icon={<Mail size={18} />} />

            <Select label="Departamento" name="departamento" value={values.departamento}
              onChange={(e) => { handleChange(e); setFieldValue('municipio', ''); }}
              onBlur={handleBlur} options={departments.map(d => ({ value: d.nombre, label: d.nombre }))}
              error={errors.departamento} touched={touched.departamento} required />
            <Select label="Municipio" name="municipio" value={values.municipio}
              onChange={handleChange} onBlur={handleBlur}
              options={municipios.map(m => ({ value: m, label: m }))}
              error={errors.municipio} touched={touched.municipio} required
              disabled={!values.departamento} />
            <Input label="Dirección" name="direccion" value={values.direccion} onChange={handleChange} onBlur={handleBlur} error={errors.direccion} touched={touched.direccion} required icon={<MapPin size={18} />} />
          </div>
        )}
      </Card>

      {/* Security */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Shield size={20} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Seguridad</h3>
              <p className="text-sm text-gray-500">Gestiona tu contraseña</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
            Cambiar Contraseña
          </Button>
        </div>
      </Card>

      {/* Change password modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => { setShowPasswordModal(false); passwordForm.resetForm(); }}
        title="Cambiar Contraseña"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowPasswordModal(false); passwordForm.resetForm(); }}>
              Cancelar
            </Button>
            <Button variant="primary" loading={changingPassword} onClick={handleChangePassword}
              className="gradient-primary border-0">
              Actualizar
            </Button>
          </>
        }
      >
        <div className="space-y-0">
          <Input label="Contraseña Actual" name="currentPassword" type="password" value={passwordForm.values.currentPassword} onChange={passwordForm.handleChange} onBlur={passwordForm.handleBlur} error={passwordForm.errors.currentPassword} touched={passwordForm.touched.currentPassword} required icon={<Lock size={18} />} />
          <Input label="Nueva Contraseña" name="newPassword" type="password" value={passwordForm.values.newPassword} onChange={passwordForm.handleChange} onBlur={passwordForm.handleBlur} error={passwordForm.errors.newPassword} touched={passwordForm.touched.newPassword} required icon={<Lock size={18} />} />
          <Input label="Confirmar Nueva Contraseña" name="confirmNewPassword" type="password" value={passwordForm.values.confirmNewPassword} onChange={passwordForm.handleChange} onBlur={passwordForm.handleBlur} error={passwordForm.errors.confirmNewPassword} touched={passwordForm.touched.confirmNewPassword} required icon={<Lock size={18} />} />
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
