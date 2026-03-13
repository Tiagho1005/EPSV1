import { useState, useCallback, useRef } from 'react';

const useForm = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const validate = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule(value, values);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
      }
    }

    setErrors(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
    return null;
  }, [validationRules, values]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    let hasErrors = false;

    for (const [name, rules] of Object.entries(validationRules)) {
      for (const rule of rules) {
        const error = rule(values[name], values);
        if (error) {
          newErrors[name] = error;
          hasErrors = true;
          break;
        }
      }
    }

    setErrors(newErrors);
    const allTouched = {};
    Object.keys(validationRules).forEach(key => { allTouched[key] = true; });
    setTouched(allTouched);

    return !hasErrors;
  }, [validationRules, values]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setValues(prev => ({ ...prev, [name]: newValue }));
    if (touched[name]) {
      setTimeout(() => validate(name, newValue), 0);
    }
  }, [touched, validate]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validate(name, value);
  }, [validate]);

  const handleSubmit = useCallback((callback) => async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const isValid = validateAll();
    if (isValid) {
      try {
        await callback(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }

    submittingRef.current = false;
    setIsSubmitting(false);
  }, [validateAll, values]);

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setTimeout(() => validate(name, value), 0);
    }
  }, [touched, validate]);

  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    resetForm,
    validateAll,
  };
};

export default useForm;
