import React, { useState } from 'react';
import { Lock, Shield } from 'lucide-react';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import useForm from '../../../hooks/useForm';
import { validators } from '../../../utils/validators';
import { api } from '../../../services/api';

const ChangePasswordForm = ({ showToast }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const passwordForm = useForm(
    { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    {
      currentPassword: [validators.required],
      newPassword: [validators.required, validators.password],
      confirmNewPassword: [validators.required, (val, vals) => validators.passwordMatch(val, vals?.newPassword)],
    }
  );

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

  return (
    <>
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
    </>
  );
};

export default ChangePasswordForm;
