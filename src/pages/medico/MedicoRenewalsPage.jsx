import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Check, X, Clock, Pill, User, Calendar } from 'lucide-react';
import { api } from '../../services/api';
import { formatDateShort } from '../../utils/formatters';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';

const ESTADO_VARIANT = { pendiente: 'warning', aprobada: 'success', rechazada: 'error' };
const ESTADO_LABEL = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

const MedicoRenewalsPage = () => {
  const { showToast } = useToast();
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [notas, setNotas] = useState({});
  const [filter, setFilter] = useState('pendiente');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getMedicoRenewals();
      setRenewals(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id, action) => {
    setProcessing(`${id}-${action}`);
    try {
      await api.processMedicoRenewal(id, action, notas[id] || '');
      showToast({
        type: 'success',
        title: action === 'approve' ? 'Renovación aprobada' : 'Solicitud rechazada',
        message: action === 'approve'
          ? 'El medicamento ha sido renovado por 30 días.'
          : 'La solicitud fue rechazada.',
      });
      setNotas(prev => { const n = { ...prev }; delete n[id]; return n; });
      load();
    } catch (e) {
      showToast({ type: 'error', title: 'Error', message: e.message });
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'all' ? renewals : renewals.filter(r => r.estado === filter);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Solicitudes de Renovación</h2>
        <p className="text-gray-500">Revisa y gestiona las solicitudes de tus pacientes</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'pendiente', label: 'Pendientes', count: renewals.filter(r => r.estado === 'pendiente').length },
          { value: 'aprobada', label: 'Aprobadas' },
          { value: 'rechazada', label: 'Rechazadas' },
          { value: 'all', label: 'Todas' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === tab.value
                ? 'bg-primary-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 bg-white/30 rounded-full px-1.5 text-xs">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Spinner className="py-12" />
      ) : error ? (
        <div className="text-error text-center py-8">{error}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <RefreshCw size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay solicitudes</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(renewal => (
            <Card key={renewal.id}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={ESTADO_VARIANT[renewal.estado]} dot>
                      {ESTADO_LABEL[renewal.estado]}
                    </Badge>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateShort(renewal.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-800">
                    <User size={15} className="text-gray-400" />
                    <p className="font-semibold">{renewal.paciente.nombreCompleto}</p>
                    <span className="text-sm text-gray-400">CC {renewal.paciente.cedula}</span>
                  </div>

                  {renewal.medicamento && (
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Pill size={15} className="text-gray-400" />
                      <span className="font-medium">{renewal.medicamento.nombre}</span>
                      <span className="text-gray-400">{renewal.medicamento.dosis} — {renewal.medicamento.frecuencia}</span>
                    </div>
                  )}

                  {renewal.nota_medico && (
                    <div className="bg-gray-50 rounded-lg p-2 text-sm text-gray-600">
                      <span className="font-medium">Nota: </span>{renewal.nota_medico}
                    </div>
                  )}
                </div>

                {/* Actions — only for pending */}
                {renewal.estado === 'pendiente' && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <textarea
                      placeholder="Nota opcional..."
                      value={notas[renewal.id] || ''}
                      onChange={e => setNotas(prev => ({ ...prev, [renewal.id]: e.target.value }))}
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        icon={<Check size={15} />}
                        loading={processing === `${renewal.id}-approve`}
                        disabled={!!processing}
                        onClick={() => handleAction(renewal.id, 'approve')}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="flex-1"
                        icon={<X size={15} />}
                        loading={processing === `${renewal.id}-reject`}
                        disabled={!!processing}
                        onClick={() => handleAction(renewal.id, 'reject')}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MedicoRenewalsPage;
