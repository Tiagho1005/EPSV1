import React from 'react';
import { Search, Stethoscope } from 'lucide-react';
import Spinner from '../../ui/Spinner';
import * as LucideIcons from 'lucide-react';

const SpecialtySelector = ({ specialties, loading, searchQuery, setSearchQuery, selectedSpecialty, onSelect }) => {
  const filteredSpecialties = specialties.filter(s =>
    s.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Selecciona una especialidad</h2>
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar especialidad..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
        />
      </div>
      {loading ? <Spinner className="py-8" /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredSpecialties.map(spec => {
            const Icon = LucideIcons[spec.icono] || Stethoscope;
            const isSelected = selectedSpecialty?.id === spec.id;
            return (
              <button
                key={spec.id}
                onClick={() => onSelect(spec)}
                className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                  isSelected ? 'gradient-primary text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon size={20} />
                </div>
                <p className={`text-xs font-medium ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                  {spec.nombre}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SpecialtySelector;
