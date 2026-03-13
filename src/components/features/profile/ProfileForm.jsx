import React, { useState } from 'react';
import { User, IdCard, Phone, Mail, MapPin, Calendar, Lock, Edit3, Save, X } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Button from '../../ui/Button';
import useForm from '../../../hooks/useForm';
import { validators } from '../../../utils/validators';
import { departments } from '../../../data/departments';
import { formatDate } from '../../../utils/formatters';
import { api } from '../../../services/api';

const InfoRow = ({ icon, label, value, locked = false }) => {
  const IconComponent = icon;
  return (
  <div className="flex items-start gap-3 py-3">
    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
      <IconComponent size={16} className="text-primary-500" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
    {locked && <Lock size={14} className="text-gray-300 mt-2" />}
  </div>
);
};

const ProfileForm = ({ user, updateUser, showToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  return (
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
  );
};

export default ProfileForm;
