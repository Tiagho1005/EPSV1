import React from 'react';
import { Search, Filter, Calendar } from 'lucide-react';
import Card from '../../ui/Card';

const MedicalHistoryFilters = ({ searchQuery, setSearchQuery, selectedYear, setSelectedYear }) => {
  const years = ['Todos', '2024', '2023', '2022'];

  return (
    <Card className="mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por especialidad o médico..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedYear === year
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
          <button className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">
            <Filter size={18} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default MedicalHistoryFilters;
