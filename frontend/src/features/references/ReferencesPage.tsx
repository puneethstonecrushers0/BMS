import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Buyer, Vehicle } from '../../types';
import { Building2, Truck, Plus, Search, Edit2, X, AlertCircle } from 'lucide-react';

export const ReferencesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'buyers' | 'vehicles'>('buyers');
  const [search, setSearch] = useState('');

  // Buyer modal state
  const [isBuyerModalOpen, setIsBuyerModalOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [buyerForm, setBuyerForm] = useState({ name: '', gstin: '', phone: '', address: '' });

  // Vehicle modal state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleForm, setVehicleForm] = useState({ vehicleNumber: '', tareWeight: '', driverName: '', driverPhone: '' });

  const [modalError, setModalError] = useState<string | null>(null);

  // Queries
  const { data: buyers, isLoading: buyersLoading } = useQuery<Buyer[]>({
    queryKey: ['allBuyers'],
    queryFn: () => apiClient<Buyer[]>('/references/buyers'),
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ['allVehicles'],
    queryFn: () => apiClient<Vehicle[]>('/references/vehicles'),
  });

  // Buyer Mutations
  const saveBuyerMutation = useMutation({
    mutationFn: (data: typeof buyerForm) => {
      if (editingBuyer) {
        return apiClient(`/references/buyers/${editingBuyer.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      }
      return apiClient('/references/buyers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allBuyers'] });
      queryClient.invalidateQueries({ queryKey: ['buyersList'] });
      setIsBuyerModalOpen(false);
      setEditingBuyer(null);
      setBuyerForm({ name: '', gstin: '', phone: '', address: '' });
      setModalError(null);
    },
    onError: (err: any) => setModalError(err.message || 'Failed to save buyer'),
  });

  // Vehicle Mutations
  const saveVehicleMutation = useMutation({
    mutationFn: (data: typeof vehicleForm) => {
      const payload = {
        ...data,
        tareWeight: data.tareWeight ? parseFloat(data.tareWeight) : null,
      };
      if (editingVehicle) {
        return apiClient(`/references/vehicles/${editingVehicle.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      return apiClient('/references/vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehiclesList'] });
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      setVehicleForm({ vehicleNumber: '', tareWeight: '', driverName: '', driverPhone: '' });
      setModalError(null);
    },
    onError: (err: any) => setModalError(err.message || 'Failed to save vehicle'),
  });

  const filteredBuyers = buyers?.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.gstin && b.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (b.phone && b.phone.includes(search))
  );

  const filteredVehicles = vehicles?.filter(
    (v) =>
      v.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (v.driverName && v.driverName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black">
            Master Reference Data
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Registered customer accounts, commercial vehicles, and standard tare weights
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'buyers' ? (
            <button
              onClick={() => {
                setEditingBuyer(null);
                setBuyerForm({ name: '', gstin: '', phone: '', address: '' });
                setIsBuyerModalOpen(true);
              }}
              className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] flex items-center space-x-1.5 rounded-none shadow-subtle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Buyer</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingVehicle(null);
                setVehicleForm({ vehicleNumber: '', tareWeight: '', driverName: '', driverPhone: '' });
                setIsVehicleModalOpen(true);
              }}
              className="px-4 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] flex items-center space-x-1.5 rounded-none shadow-subtle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex space-x-1 border-b border-[#e5e7eb]">
          <button
            onClick={() => {
              setActiveTab('buyers');
              setSearch('');
            }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'buyers'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-[#6b7280] hover:text-black'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Buyers & Contractors ({buyers?.length || 0})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('vehicles');
              setSearch('');
            }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'vehicles'
                ? 'border-black text-black bg-white'
                : 'border-transparent text-[#6b7280] hover:text-black'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Commercial Vehicles ({vehicles?.length || 0})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder={activeTab === 'buyers' ? 'Search buyers...' : 'Search vehicles...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono bg-white"
          />
          <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Content Tables */}
      {activeTab === 'buyers' ? (
        <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
          {buyersLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6b7280]">Loading buyers...</div>
          ) : filteredBuyers?.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-[#6b7280]">
              No buyers registered yet. Add buyers directly or they will auto-register on first sale entry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                  <tr>
                    <th className="py-2.5 px-4">Buyer / Entity Name</th>
                    <th className="py-2.5 px-4">GSTIN</th>
                    <th className="py-2.5 px-4">Contact Phone</th>
                    <th className="py-2.5 px-4">Address / Site</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {filteredBuyers?.map((buyer) => (
                    <tr key={buyer.id} className="hover:bg-[#f9fafb]">
                      <td className="py-2.5 px-4 font-semibold text-black">{buyer.name}</td>
                      <td className="py-2.5 px-4 font-mono text-[#4b5563]">{buyer.gstin || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-[#4b5563]">{buyer.phone || '—'}</td>
                      <td className="py-2.5 px-4 text-[#6b7280]">{buyer.address || '—'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#e5e7eb] bg-[#f9fafb] text-black">
                          {buyer.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingBuyer(buyer);
                            setBuyerForm({
                              name: buyer.name,
                              gstin: buyer.gstin || '',
                              phone: buyer.phone || '',
                              address: buyer.address || '',
                            });
                            setIsBuyerModalOpen(true);
                          }}
                          className="p-1 text-[#6b7280] hover:text-black"
                          title="Edit Buyer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
          {vehiclesLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6b7280]">Loading vehicles...</div>
          ) : filteredVehicles?.length === 0 ? (
            <div className="p-16 text-center text-xs font-mono text-[#6b7280]">
              No commercial vehicles registered yet. Vehicles auto-register on first trip or sale entry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                  <tr>
                    <th className="py-2.5 px-4">Vehicle Registration No.</th>
                    <th className="py-2.5 px-4 text-right">Calibrated Tare Wt (Tons)</th>
                    <th className="py-2.5 px-4">Assigned Driver</th>
                    <th className="py-2.5 px-4">Driver Phone</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {filteredVehicles?.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-[#f9fafb]">
                      <td className="py-2.5 px-4 font-mono font-bold text-black">{vehicle.vehicleNumber}</td>
                      <td className="py-2.5 px-4 font-mono text-right font-semibold text-black">
                        {vehicle.tareWeight ? Number(vehicle.tareWeight).toFixed(3) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-[#4b5563]">{vehicle.driverName || '—'}</td>
                      <td className="py-2.5 px-4 font-mono text-[#6b7280]">{vehicle.driverPhone || '—'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#e5e7eb] bg-[#f9fafb] text-black">
                          {vehicle.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingVehicle(vehicle);
                            setVehicleForm({
                              vehicleNumber: vehicle.vehicleNumber,
                              tareWeight: vehicle.tareWeight ? String(vehicle.tareWeight) : '',
                              driverName: vehicle.driverName || '',
                              driverPhone: vehicle.driverPhone || '',
                            });
                            setIsVehicleModalOpen(true);
                          }}
                          className="p-1 text-[#6b7280] hover:text-black"
                          title="Edit Vehicle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Buyer Edit/Create Modal */}
      {isBuyerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-sm w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                {editingBuyer ? 'Edit Buyer Details' : 'Register New Buyer'}
              </h3>
              <button onClick={() => setIsBuyerModalOpen(false)} className="text-[#9ca3af] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveBuyerMutation.mutate(buyerForm);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Buyer Name
                </label>
                <input
                  type="text"
                  required
                  value={buyerForm.name}
                  onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                  placeholder="Company / Client Name"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={buyerForm.gstin}
                  onChange={(e) => setBuyerForm({ ...buyerForm, gstin: e.target.value })}
                  placeholder="29AAAAA0000A1Z5"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={buyerForm.phone}
                  onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Site / Address
                </label>
                <input
                  type="text"
                  value={buyerForm.address}
                  onChange={(e) => setBuyerForm({ ...buyerForm, address: e.target.value })}
                  placeholder="Project site / Delivery address"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
              </div>

              <div className="pt-3 border-t border-[#e5e7eb] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBuyerModalOpen(false)}
                  className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveBuyerMutation.isPending}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {saveBuyerMutation.isPending ? 'Saving...' : 'Save Buyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Edit/Create Modal */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white border border-[#e5e7eb] max-w-sm w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                {editingVehicle ? 'Edit Vehicle' : 'Register Vehicle'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-[#9ca3af] hover:text-black">
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveVehicleMutation.mutate(vehicleForm);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  required
                  value={vehicleForm.vehicleNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="KA01AB1234"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Calibrated Tare Wt (Tons)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={vehicleForm.tareWeight}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, tareWeight: e.target.value })}
                  placeholder="10.250"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={vehicleForm.driverName}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                  placeholder="Driver Full Name"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Driver Phone
                </label>
                <input
                  type="text"
                  value={vehicleForm.driverPhone}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, driverPhone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#e5e7eb] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveVehicleMutation.isPending}
                  className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {saveVehicleMutation.isPending ? 'Saving...' : 'Save Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
