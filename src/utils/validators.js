export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'Este campo es obligatorio';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      return 'Ingresa un correo electrónico válido';
    }
    return null;
  },

  cedula: (value) => {
    if (!value) return null;
    if (/\s/.test(value)) {
      return 'La cédula no debe contener espacios';
    }
    if (!/^\d+$/.test(value)) {
      return 'La cédula solo debe contener números';
    }
    if (value.length < 6 || value.length > 12) {
      return 'La cédula debe tener entre 6 y 12 dígitos';
    }
    return null;
  },

  celular: (value) => {
    if (!value) return null;
    if (!/^\d+$/.test(value)) {
      return 'El celular solo debe contener números';
    }
    if (value.length !== 10) {
      return 'El celular debe tener 10 dígitos';
    }
    if (!value.startsWith('3')) {
      return 'El número de celular debe iniciar con 3';
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    const errors = [];
    if (value.length < 8) errors.push('Mínimo 8 caracteres');
    if (!/[A-Z]/.test(value)) errors.push('Una letra mayúscula');
    if (!/[a-z]/.test(value)) errors.push('Una letra minúscula');
    if (!/[0-9]/.test(value)) errors.push('Un número');
    if (!/[!@#$%^&*]/.test(value)) errors.push('Un carácter especial (!@#$%^&*)');
    if (/\s/.test(value)) errors.push('No puede contener espacios');
    return errors.length > 0 ? errors.join('. ') : null;
  },

  passwordStrength: (value) => {
    if (!value) return { level: 0, label: '', color: '' };
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*]/.test(value)) score++;

    if (score <= 2) return { level: score, label: 'Débil', color: 'error' };
    if (score <= 4) return { level: score, label: 'Media', color: 'warning' };
    return { level: score, label: 'Fuerte', color: 'success' };
  },

  passwordMatch: (value, compareValue) => {
    if (!value) return null;
    if (value !== compareValue) {
      return 'Las contraseñas no coinciden';
    }
    return null;
  },

  notEqualTo: (field, label) => (value, allValues) => {
    if (!value || !allValues?.[field]) return null;
    if (value === allValues[field]) {
      return `La contraseña no puede ser igual a tu ${label}`;
    }
    return null;
  },

  nombreCompleto: (value) => {
    if (!value) return null;
    if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
    if (value.trim().length > 100) return 'El nombre no puede exceder 100 caracteres';
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value)) return 'El nombre solo puede contener letras y espacios';
    const parts = value.trim().split(/\s+/);
    if (parts.length < 2) return 'Ingresa tu nombre y al menos un apellido';
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Debe tener al menos ${min} caracteres`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `No puede exceder ${max} caracteres`;
    }
    return null;
  },

  direccion: (value) => {
    if (!value) return null;
    if (value.trim().length < 10) return 'Ingresa una dirección más completa';
    if (value.trim().length > 200) return 'La dirección no puede exceder 200 caracteres';
    return null;
  },

  date: {
    notFuture: (value) => {
      if (!value) return null;
      if (new Date(value) > new Date()) {
        return 'La fecha no puede ser futura';
      }
      return null;
    },
    notPast: (value) => {
      if (!value) return null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(value) < today) {
        return 'La fecha no puede ser pasada';
      }
      return null;
    },
    minAge: (years) => (value) => {
      if (!value) return null;
      const birth = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < years) {
        return `Debes ser mayor de ${years} años para registrarte`;
      }
      return null;
    },
    maxAge: (years) => (value) => {
      if (!value) return null;
      const birth = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      if (age > years) {
        return 'Verifica la fecha de nacimiento ingresada';
      }
      return null;
    },
  },
};
