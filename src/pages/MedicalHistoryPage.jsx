import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText, Calendar, User, MapPin, ChevronDown, ChevronUp,
  ClipboardList, FlaskConical, Pill as PillIcon, Download, Filter, X as XIcon
} from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { formatDateFull, formatDate } from '../utils/formatters';

const MedicalHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterSpecialty, setFilterSpecialty] = useState('todas');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMedicalHistory();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const specialtyOptions = useMemo(() => {
    const unique = [...new Set(history.map(r => r.especialidad))];
    return [{ value: 'todas', label: 'Todas las especialidades' }, ...unique.map(s => ({ value: s, label: s }))];
  }, [history]);

  const filtered = useMemo(() => {
    return history.filter(r => {
      if (filterSpecialty !== 'todas' && r.especialidad !== filterSpecialty) return false;
      if (filterDateFrom && r.fecha < filterDateFrom) return false;
      if (filterDateTo && r.fecha > filterDateTo) return false;
      return true;
    });
  }, [history, filterSpecialty, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterSpecialty !== 'todas' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterSpecialty('todas');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleDownloadPDF = () => {
    const content = filtered.map(r => [
      `Fecha: ${formatDate(r.fecha)}`,
      `Especialidad: ${r.especialidad}`,
      `Médico: ${r.medico}`,
      `Sede: ${r.sede}`,
      `Diagnóstico: ${r.diagnostico}`,
      `Notas: ${r.notas}`,
      r.recetas.length > 0 ? `Recetas: ${r.recetas.join(' | ')}` : '',
      r.examenes.length > 0 ? `Exámenes: ${r.examenes.join(' | ')}` : '',
      '─'.repeat(50),
    ].filter(Boolean).join('\n')).join('\n\n');

    const text = `HISTORIAL MÉDICO\n${'═'.repeat(50)}\n\n${content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial-medico-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'Descarga iniciada', message: 'Tu historial ha sido descargado' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial Médico</h1>
          <p className="text-gray-500 text-sm">Consulta el registro de tus atenciones médicas</p>
        </div>
        {!loading && history.length > 0 && (
          <Button
            variant="outline"
            icon={<Download size={16} />}
            onClick={handleDownloadPDF}
            className="text-primary-600 border-primary-200 hover:bg-primary-50"
          >
            Descargar historial
          </Button>
        )}
      </div>

      {/* Filters */}
      {!loading && history.length > 0 && (
        <Card padding="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2 text-sm text-gray-500 mr-1">
              <Filter size={15} />
              <span className="font-medium">Filtrar por:</span>
            </div>

            {/* Specialty */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Especialidad</label>
              <select
                value={filterSpecialty}
                onChange={e => setFilterSpecialty(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 cursor-pointer"
              >
                {specialtyOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                max={filterDateTo || undefined}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Hasta</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                min={filterDateFrom || undefined}
                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-error border border-error/30 hover:bg-error-light transition-all cursor-pointer self-end"
              >
                <XIcon size={12} /> Limpiar
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <p className="text-xs text-gray-400 mt-2">
              Mostrando {filtered.length} de {history.length} registro{history.length !== 1 ? 's' : ''}
            </p>
          )}
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} variant="card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="FileText"
          title={history.length === 0 ? 'Sin registros médicos' : 'Sin resultados'}
          description={history.length === 0
            ? 'Aún no tienes consultas registradas en tu historial'
            : 'No hay registros que coincidan con los filtros seleccionados'
          }
        />
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 via-secondary-300 to-primary-200 hidden sm:block" />

          <div className="space-y-4">
            {filtered.map((record) => {
              const isExpanded = expandedId === record.id;
              return (
                <div key={record.id} className="relative sm:pl-16">
                  {/* Timeline dot */}
                  <div className="absolute left-4 top-6 w-5 h-5 rounded-full border-4 border-white shadow-md gradient-primary hidden sm:block" />

                  <Card hover className={`transition-all ${isExpanded ? 'ring-2 ring-primary-200' : ''}`}>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : record.id)}
                      className="w-full text-left cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="primary">{record.especialidad}</Badge>
                            <span className="text-xs text-gray-400">
                              {formatDate(record.fecha)}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-800 mt-2">{record.diagnostico}</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <User size={14} /> {record.medico}
                            <span className="mx-1">•</span>
                            <MapPin size={14} /> {record.sede}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-gray-400 mt-1">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in-up space-y-4">
                        {/* Notes */}
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ClipboardList size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Notas</p>
                            <p className="text-sm text-gray-700">{record.notas}</p>
                          </div>
                        </div>

                        {/* Prescriptions */}
                        {record.recetas.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                              <PillIcon size={16} className="text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Recetas</p>
                              <ul className="space-y-1">
                                {record.recetas.map((r, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        {/* Exams */}
                        {record.examenes.length > 0 && (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <FlaskConical size={16} className="text-purple-600" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Exámenes</p>
                              <ul className="space-y-1">
                                {record.examenes.map((e, i) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                                    {e}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalHistoryPage;
