import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { BoulderTrip, Vehicle, User } from '../../types';
import { useAuth } from '../auth/AuthContext';
import {
  Plus,
  Download,
  Search,
  Calendar,
  AlertCircle,
  X,
  Ban,
  Truck,
  UserCheck,
  Filter,
} from 'lucide-react';

const getNowLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export const BouldersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cancelModalTrip, setCancelModalTrip] = useState<BoulderTrip | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    tripDate: getNowLocalDateTime(),
    supplierOrOperator: '',
    vehicleNumber: '',
    grossWeight: '',
    tareWeight: '',
    driverName: '',
    remarks: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Vehicles list for autocomplete
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehiclesList'],
    queryFn: () => apiClient<Vehicle[]>('/references/vehicles'),
  });

  // Operators data for Admin filter (Strictly restricted to Admin role)
  const { data: usersList } = useQuery<User[]>({
    queryKey: ['usersList'],
    queryFn: () => apiClient<User[]>('/users'),
    enabled: isAdmin,
  });
  const boulderOperators = usersList?.filter((u) => u.role === 'BOULDER_OPERATOR') || [];

  // Distinct suppliers and drivers for filter auto-complete and selection
  const { data: suppliersList } = useQuery<string[]>({
    queryKey: ['boulderSuppliers'],
    queryFn: () => apiClient<string[]>('/boulders/suppliers'),
  });

  const { data: driversList } = useQuery<string[]>({
    queryKey: ['boulderDrivers'],
    queryFn: () => apiClient<string[]>('/boulders/drivers'),
  });

  // Query Trips List
  const { data, isLoading, error } = useQuery<{ trips: BoulderTrip[]; totalCount: number }>({
    queryKey: [
      'boulderTripsList',
      search,
      supplierFilter,
      vehicleFilter,
      driverFilter,
      operatorFilter,
      startDate,
      endDate,
      page,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (supplierFilter) params.set('supplierName', supplierFilter);
      if (vehicleFilter) params.set('vehicleNumber', vehicleFilter);
      if (driverFilter) params.set('driverName', driverFilter);
      if (isAdmin && operatorFilter) params.set('operatorId', operatorFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return apiClient<{ trips: BoulderTrip[]; totalCount: number }>(`/boulders?${params.toString()}`);
    },
  });

  // Combined available suppliers from API and active query result
  const availableSuppliers = useMemo(() => {
    const set = new Set<string>(suppliersList || []);
    data?.trips?.forEach((t) => {
      if (t.supplierOrOperator?.trim()) set.add(t.supplierOrOperator.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [suppliersList, data?.trips]);

  // Combined available drivers from API, vehicles, and active query result
  const availableDrivers = useMemo(() => {
    const set = new Set<string>(driversList || []);
    data?.trips?.forEach((t) => {
      if (t.driverName?.trim()) set.add(t.driverName.trim());
    });
    vehicles?.forEach((v) => {
      if (v.driverName?.trim()) set.add(v.driverName.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [driversList, data?.trips, vehicles]);

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (newTrip: typeof formData) => {
      return apiClient('/boulders', {
        method: 'POST',
        body: JSON.stringify({
          ...newTrip,
          grossWeight: parseFloat(newTrip.grossWeight),
          tareWeight: parseFloat(newTrip.tareWeight),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulderTripsList'] });
      queryClient.invalidateQueries({ queryKey: ['boulderSuppliers'] });
      queryClient.invalidateQueries({ queryKey: ['boulderDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['overviewMetrics'] });
      setIsCreateOpen(false);
      setFormData({
        tripDate: getNowLocalDateTime(),
        supplierOrOperator: '',
        vehicleNumber: '',
        grossWeight: '',
        tareWeight: '',
        driverName: '',
        remarks: '',
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record boulder trip');
    },
  });

  // Cancel Trip Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => {
      return apiClient(`/boulders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boulderTripsList'] });
      queryClient.invalidateQueries({ queryKey: ['boulderSuppliers'] });
      queryClient.invalidateQueries({ queryKey: ['boulderDrivers'] });
      queryClient.invalidateQueries({ queryKey: ['overviewMetrics'] });
      setCancelModalTrip(null);
      setCancellationReason('');
    },
  });

  // Export CSV
  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (supplierFilter) params.set('supplierName', supplierFilter);
    if (vehicleFilter) params.set('vehicleNumber', vehicleFilter);
    if (driverFilter) params.set('driverName', driverFilter);
    if (isAdmin && operatorFilter) params.set('operatorId', operatorFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    const blob = await apiClient<Blob>(`/boulders/export/csv?${params.toString()}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boulder_trips_export_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Live calculation preview
  const grossNum = parseFloat(formData.grossWeight) || 0;
  const tareNum = parseFloat(formData.tareWeight) || 0;
  const previewNet = grossNum >= tareNum ? (grossNum - tareNum).toFixed(3) : '0.000';

  // Subtotals
  const activeTrips = data?.trips.filter((t) => !t.isCancelled) || [];
  const pageNetTotal = activeTrips.reduce((sum, t) => sum + Number(t.netWeight), 0);
  const selectedOperator = boulderOperators.find((o) => o.id === operatorFilter);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black">
            Boulder Inflow Ledger
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Quarry boulder trips, haulage intake verification, and net tonnage receipts
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 border border-[#d1d5db] bg-white text-xs font-semibold uppercase text-black hover:bg-[#f3f4f6] flex items-center space-x-1.5 rounded-none shadow-subtle"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] flex items-center space-x-1.5 rounded-none shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Boulder Trip</span>
          </button>
        </div>
      </div>

      {/* Operator Contribution Highlights Banner (Admin Only, when an operator is filtered) */}
      {isAdmin && operatorFilter && (
        <div className="p-4 bg-white border-2 border-black shadow-card rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-black" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#6b7280] tracking-wider block">
                  Admin Boulder Operator Intake Contribution
                </span>
                <span className="text-sm font-bold text-black font-mono">
                  {selectedOperator ? `${selectedOperator.name} (${selectedOperator.email})` : 'Operator Filter Active'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Verified Intake</div>
                <div className="text-sm font-bold text-black">{pageNetTotal.toFixed(3)} Tons</div>
              </div>
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Haulage Trips</div>
                <div className="text-sm font-bold text-black">{activeTrips.length} Trips</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none space-y-3 font-mono">
        {/* Row 1: Search, Supplier Name, Driver Name, Vehicle Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
              Search Keyword
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Challan, vehicle, driver..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
              />
              <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Supplier / Quarry Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                Supplier / Quarry
              </label>
              {supplierFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSupplierFilter('');
                    setPage(1);
                  }}
                  className="text-[9px] text-[#9ca3af] hover:text-black uppercase underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              list="boulderSupplierFilterOptions"
              placeholder="All Suppliers / Type to filter..."
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs border ${
                supplierFilter ? 'border-black bg-[#f9fafb] font-bold' : 'border-[#d1d5db] bg-white'
              } font-mono rounded-none focus:outline-none focus:border-black`}
            />
            <datalist id="boulderSupplierFilterOptions">
              {availableSuppliers.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          {/* Driver Name Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                Driver Name
              </label>
              {driverFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setDriverFilter('');
                    setPage(1);
                  }}
                  className="text-[9px] text-[#9ca3af] hover:text-black uppercase underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              list="boulderDriverFilterOptions"
              placeholder="All Drivers / Type to filter..."
              value={driverFilter}
              onChange={(e) => {
                setDriverFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs border ${
                driverFilter ? 'border-black bg-[#f9fafb] font-bold' : 'border-[#d1d5db] bg-white'
              } font-mono rounded-none focus:outline-none focus:border-black`}
            />
            <datalist id="boulderDriverFilterOptions">
              {availableDrivers.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* Vehicle Number Filter */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                Vehicle Number
              </label>
              {vehicleFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setVehicleFilter('');
                    setPage(1);
                  }}
                  className="text-[9px] text-[#9ca3af] hover:text-black uppercase underline"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="text"
              list="boulderVehicleFilterOptions"
              placeholder="e.g. KA04... / All"
              value={vehicleFilter}
              onChange={(e) => {
                setVehicleFilter(e.target.value.toUpperCase());
                setPage(1);
              }}
              className={`w-full px-2.5 py-1.5 text-xs border ${
                vehicleFilter ? 'border-black bg-[#f9fafb] font-bold' : 'border-[#d1d5db] bg-white'
              } font-mono rounded-none focus:outline-none focus:border-black uppercase`}
            />
            <datalist id="boulderVehicleFilterOptions">
              {vehicles?.map((v) => (
                <option key={v.id} value={v.vehicleNumber}>
                  {v.driverName ? `Driver: ${v.driverName}` : undefined}
                </option>
              ))}
            </datalist>
          </div>
        </div>

        {/* Row 2: Date Range, Operator Filter, and Quick Controls */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 items-end pt-1`}>
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
              Trip Date Range (IST)
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-1.5 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black bg-white"
              />
              <span className="text-xs text-[#6b7280]">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-1.5 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black bg-white"
              />
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                Boulder Operator
              </label>
              <select
                value={operatorFilter}
                onChange={(e) => {
                  setOperatorFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-black font-mono font-semibold rounded-none focus:outline-none bg-white text-black"
              >
                <option value="">All Boulder Operators</option>
                {boulderOperators.map((op) => (
                  <option key={op.id} value={op.id}>
                    Operator: {op.name} ({op.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick preset chips or filter count */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setStartDate(today);
                setEndDate(today);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-[10px] font-mono uppercase border border-[#d1d5db] text-[#4b5563] hover:text-black hover:border-black bg-[#f9fafb]"
            >
              Today's Trips
            </button>
            {(search || supplierFilter || vehicleFilter || driverFilter || operatorFilter || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSupplierFilter('');
                  setVehicleFilter('');
                  setDriverFilter('');
                  setOperatorFilter('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-[10px] font-mono uppercase bg-black text-white hover:bg-[#1f2937]"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {(supplierFilter || driverFilter || vehicleFilter || search || operatorFilter || startDate || endDate) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#f3f4f6] text-[10px]">
            <span className="text-[#6b7280] uppercase font-bold mr-1">Active Ledger Filters:</span>
            {supplierFilter && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-black text-white font-bold">
                <span>Supplier: {supplierFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSupplierFilter('');
                    setPage(1);
                  }}
                  className="hover:text-red-300 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
            {driverFilter && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-black text-white font-bold">
                <span>Driver: {driverFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDriverFilter('');
                    setPage(1);
                  }}
                  className="hover:text-red-300 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
            {vehicleFilter && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#f3f4f6] border border-[#d1d5db] text-black">
                <span>Vehicle: {vehicleFilter}</span>
                <button
                  type="button"
                  onClick={() => {
                    setVehicleFilter('');
                    setPage(1);
                  }}
                  className="hover:text-red-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#f3f4f6] border border-[#d1d5db] text-black">
                <span>Keyword: "{search}"</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="hover:text-red-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
            {selectedOperator && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#f3f4f6] border border-black text-black">
                <span>Operator: {selectedOperator.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setOperatorFilter('');
                    setPage(1);
                  }}
                  className="hover:text-red-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-[#f3f4f6] border border-[#d1d5db] text-[#4b5563]">
                <span>Date: {startDate || '—'} to {endDate || '—'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="hover:text-red-600 font-bold ml-1"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Boulder Data Table */}
      <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-mono text-[#6b7280]">
            Loading boulder trip ledger...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-mono text-black">
            Error loading records: {(error as any).message}
          </div>
        ) : data?.trips.length === 0 ? (
          <div className="p-16 text-center text-xs font-mono text-[#6b7280]">
            No boulder trips found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                <tr>
                  <th className="py-2.5 px-3">Date & Time (IST)</th>
                  <th className="py-2.5 px-3">Supplier / Operator</th>
                  <th className="py-2.5 px-3">Vehicle Number</th>
                  <th className="py-2.5 px-3">Driver Name</th>
                  <th className="py-2.5 px-3 text-right">Gross (T)</th>
                  <th className="py-2.5 px-3 text-right">Tare (T)</th>
                  <th className="py-2.5 px-3 text-right">Net Wt (Tons)</th>
                  <th className="py-2.5 px-3">Remarks</th>
                  {isAdmin && <th className="py-2.5 px-3 text-left">Boulder Operator</th>}
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {data?.trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className={`hover:bg-[#f9fafb] transition-colors ${
                      trip.isCancelled ? 'opacity-60 bg-[#f9fafb]' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#4b5563]">
                      <div className="font-semibold text-black">
                        {new Date(trip.tripDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-[10px] text-[#6b7280]">
                        {new Date(trip.tripDate).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td
                      onClick={() => {
                        setSupplierFilter(trip.supplierOrOperator);
                        setPage(1);
                      }}
                      className={`py-2.5 px-3 font-medium cursor-pointer hover:underline ${
                        supplierFilter && trip.supplierOrOperator.toLowerCase().includes(supplierFilter.toLowerCase())
                          ? 'bg-[#f3f4f6] font-bold text-black border-l-2 border-black'
                          : 'text-black'
                      }`}
                      title="Click to filter by this supplier"
                    >
                      {trip.supplierOrOperator}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-black">{trip.vehicleNumber}</td>
                    <td
                      onClick={() => {
                        if (trip.driverName) {
                          setDriverFilter(trip.driverName);
                          setPage(1);
                        }
                      }}
                      className={`py-2.5 px-3 ${
                        trip.driverName ? 'cursor-pointer hover:underline' : ''
                      } ${
                        driverFilter && trip.driverName && trip.driverName.toLowerCase().includes(driverFilter.toLowerCase())
                          ? 'bg-[#f3f4f6] font-bold text-black border-l-2 border-black'
                          : 'text-[#4b5563]'
                      }`}
                      title={trip.driverName ? 'Click to filter by this driver' : undefined}
                    >
                      {trip.driverName || '—'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-[#6b7280]">
                      {Number(trip.grossWeight).toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right text-[#6b7280]">
                      {Number(trip.tareWeight).toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-right font-bold text-black">
                      {Number(trip.netWeight).toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-[#6b7280] truncate max-w-[120px]">
                      {trip.remarks || '—'}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#4b5563]">
                        {trip.createdBy ? trip.createdBy.name : '—'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-center">
                      {trip.isCancelled ? (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-black text-white">
                          CANCELLED
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#e5e7eb] text-[#4b5563]">
                          ACTIVE
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {!trip.isCancelled && (
                        <button
                          onClick={() => setCancelModalTrip(trip)}
                          className="p-1 text-[#6b7280] hover:text-black border border-transparent hover:border-[#d1d5db]"
                          title="Cancel trip"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals Row */}
              <tfoot className="bg-[#f9fafb] border-t-2 border-[#e5e7eb] font-mono font-bold text-xs">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 uppercase text-[10px] text-black">
                    Page Active Boulder Tonnage ({activeTrips.length} Trips)
                  </td>
                  <td className="py-2.5 px-3 text-right text-black font-bold">
                    {pageNetTotal.toFixed(3)} Tons
                  </td>
                  <td colSpan={isAdmin ? 4 : 3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalCount > limit && (
          <div className="p-3 border-t border-[#e5e7eb] flex items-center justify-between text-xs font-mono text-[#6b7280] bg-[#f9fafb]">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalCount)} of {data.totalCount} trips
            </div>
            <div className="flex space-x-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 border border-[#d1d5db] bg-white text-black disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= data.totalCount}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 border border-[#d1d5db] bg-white text-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Boulder Trip Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-md w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                Record New Boulder Haulage Trip
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#9ca3af] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Trip Date & Time (IST)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.tripDate}
                  onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Supplier / Quarry Operator
                </label>
                <input
                  type="text"
                  required
                  list="boulderModalSupplierOptions"
                  value={formData.supplierOrOperator}
                  onChange={(e) => setFormData({ ...formData, supplierOrOperator: e.target.value })}
                  placeholder="Quarry Site A / Shrinidhi Mines"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
                <datalist id="boulderModalSupplierOptions">
                  {availableSuppliers.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  required
                  list="boulderVehicleOptions"
                  value={formData.vehicleNumber}
                  onChange={(e) => {
                    const vNum = e.target.value.toUpperCase();
                    const matched = vehicles?.find(
                      (v) => v.vehicleNumber.toLowerCase() === vNum.toLowerCase()
                    );
                    setFormData({
                      ...formData,
                      vehicleNumber: vNum,
                      tareWeight: matched?.tareWeight ? String(matched.tareWeight) : formData.tareWeight,
                      driverName: matched?.driverName || formData.driverName,
                    });
                  }}
                  placeholder="KA01AB1234"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
                <datalist id="boulderVehicleOptions">
                  {vehicles?.map((v) => (
                    <option key={v.id} value={v.vehicleNumber} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Gross Wt (Tons)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.grossWeight}
                    onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                    placeholder="35.000"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Tare Wt (Tons)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    value={formData.tareWeight}
                    onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
                    placeholder="12.000"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono text-right"
                  />
                </div>
              </div>

              {/* Live Net Weight Preview */}
              <div className="p-3 border border-black bg-[#f9fafb] flex items-center justify-between text-xs font-mono">
                <span className="text-[#6b7280] uppercase">Calculated Boulder Net:</span>
                <span className="text-sm font-bold text-black">{previewNet} Tons</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Driver Name (Optional)
                </label>
                <input
                  type="text"
                  list="boulderModalDriverOptions"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Driver / Operator Name"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
                <datalist id="boulderModalDriverOptions">
                  {availableDrivers.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Quarry pit / boulder size remarks"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-[#e5e7eb] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-[#d1d5db] text-xs font-semibold uppercase text-black hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Record Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-sm w-full p-6 shadow-elevated rounded-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-2 flex items-center space-x-1.5">
              <Ban className="w-4 h-4 text-black" />
              <span>Cancel Boulder Trip</span>
            </h3>
            <p className="text-xs text-[#4b5563] mb-4">
              This action is permanent and auditable. The trip record will be marked as cancelled in the ledger.
            </p>

            <div className="mb-4 p-2.5 bg-[#f9fafb] border border-[#e5e7eb] text-[11px] font-mono">
              <div>Supplier: {cancelModalTrip.supplierOrOperator}</div>
              <div>Vehicle: {cancelModalTrip.vehicleNumber}</div>
              <div>Net Weight: {Number(cancelModalTrip.netWeight).toFixed(3)} Tons</div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                Reason for Cancellation
              </label>
              <textarea
                required
                rows={2}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Weighbridge calibration discrepancy"
                className="w-full p-2 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCancelModalTrip(null)}
                className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6]"
              >
                Keep Record
              </button>
              <button
                disabled={!cancellationReason.trim() || cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancelModalTrip.id,
                    reason: cancellationReason,
                  })
                }
                className="px-3 py-1.5 bg-black text-white text-xs font-bold uppercase disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
