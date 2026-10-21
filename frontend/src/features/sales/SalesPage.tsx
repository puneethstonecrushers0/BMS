import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Sale, Buyer, Vehicle, User, PaymentCategory } from '../../types';
import { useAuth } from '../auth/AuthContext';
import {
  Plus,
  Download,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  X,
  Ban,
  Check,
  UserCheck,
  Scale,
  Clock,
  Truck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const getNowLocalDateTime = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

const format24HourDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

const VEHICLE_TYPES = [
  '10 WHEELER',
  '6 WHEELER',
  '12 WHEELER',
  '14 WHEELER',
  'TIPPER',
  'TRACTOR',
  'TRAILER',
  'MINI TRUCK',
  'OTHER',
];

const COMMON_MATERIALS = [
  'M-SAND',
  'P-SAND',
  '20MM AGGREGATE',
  '40MM AGGREGATE',
  '10MM AGGREGATE',
  'GSB',
  'WMM',
  'QUARRY DUST',
  'BOULDERS',
];

interface OperatorGroup {
  operatorId: string;
  operatorName: string;
  operatorEmail: string;
  sales: Sale[];
  subtotalTare: number;
  subtotalGross: number;
  subtotalNet: number;
  subtotalAmount: number;
}

export const SalesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // Modals & Panels
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Inline Vehicle Master Registration Modal & feedback state
  const [isVehicleRegModalOpen, setIsVehicleRegModalOpen] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({
    vehicleNumber: '',
    tareWeight: '',
    driverName: '',
    driverPhone: '',
  });
  const [vehicleRegError, setVehicleRegError] = useState<string | null>(null);
  const [tareRetrievedMessage, setTareRetrievedMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    serialNumber: '',
    transactionDate: getNowLocalDateTime(),
    buyerName: '',
    gstin: '',
    vehicleNumber: '',
    vehicleType: '10 WHEELER',
    material: 'M-SAND',
    grossWeight: '',
    grossDateTime: getNowLocalDateTime(),
    tareWeight: '',
    tareDateTime: getNowLocalDateTime(),
    rate: '0',
    creditDebit: 'C',
    paymentCategory: 'ACCOUNT' as PaymentCategory,
    referenceNumber: '',
    remarks: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Autocomplete data for buyers and vehicles
  const { data: buyers } = useQuery<Buyer[]>({
    queryKey: ['buyersList'],
    queryFn: () => apiClient<Buyer[]>('/references/buyers'),
  });

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
  const salesOperators = usersList?.filter((u) => u.role === 'SALES_OPERATOR') || [];

  // Register new vehicle in Master Data mutation
  const registerVehicleMutation = useMutation({
    mutationFn: (newVehicle: typeof newVehicleData) => {
      const payload = {
        vehicleNumber: newVehicle.vehicleNumber.trim().toUpperCase().replace(/\s+/g, ''),
        tareWeight: newVehicle.tareWeight ? parseFloat(newVehicle.tareWeight) : null,
        driverName: newVehicle.driverName?.trim() || null,
        driverPhone: newVehicle.driverPhone?.trim() || null,
      };
      return apiClient<Vehicle>('/references/vehicles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['vehiclesList'] });
      queryClient.invalidateQueries({ queryKey: ['allVehicles'] });
      // Auto-populate into the sales entry form
      setFormData((prev) => ({
        ...prev,
        vehicleNumber: saved.vehicleNumber,
        tareWeight:
          saved.tareWeight !== null && saved.tareWeight !== undefined
            ? String(saved.tareWeight)
            : prev.tareWeight,
        tareDateTime: getNowLocalDateTime(),
      }));
      setTareRetrievedMessage(`Registered Tare auto-retrieved from Master: ${saved.tareWeight ?? 0} T`);
      setIsVehicleRegModalOpen(false);
      setNewVehicleData({ vehicleNumber: '', tareWeight: '', driverName: '', driverPhone: '' });
      setVehicleRegError(null);
    },
    onError: (err: any) => {
      setVehicleRegError(err.message || 'Failed to register vehicle in master');
    },
  });

  // Automatic Tare Retrieval Handler
  const handleVehicleChange = (inputVal: string) => {
    const vNum = inputVal.toUpperCase();
    const clean = vNum.replace(/\s+/g, '');
    const matched = vehicles?.find(
      (v) => v.vehicleNumber.replace(/\s+/g, '').toUpperCase() === clean
    );

    if (matched && matched.tareWeight !== null && matched.tareWeight !== undefined) {
      setFormData((prev) => ({
        ...prev,
        vehicleNumber: vNum,
        tareWeight: String(matched.tareWeight),
        // Record current weighing workflow timestamp, never vehicle registration timestamp!
        tareDateTime: getNowLocalDateTime(),
      }));
      setTareRetrievedMessage(`Tare auto-retrieved from Master: ${matched.tareWeight} T`);
      setFormError(null);
    } else {
      setFormData((prev) => ({
        ...prev,
        vehicleNumber: vNum,
      }));
      setTareRetrievedMessage(null);
    }
  };

  const openRegisterVehicleModal = (vehNum?: string) => {
    const rawNumber = (vehNum || formData.vehicleNumber || '').toUpperCase().replace(/\s+/g, '');
    setNewVehicleData({
      vehicleNumber: rawNumber,
      tareWeight: formData.tareWeight || '',
      driverName: '',
      driverPhone: '',
    });
    setVehicleRegError(null);
    setIsVehicleRegModalOpen(true);
  };

  const currentCleanVehicleNumber = formData.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
  const matchedMasterVehicle = vehicles?.find(
    (v) => v.vehicleNumber.replace(/\s+/g, '').toUpperCase() === currentCleanVehicleNumber
  );
  const isVehicleMissingInMaster = currentCleanVehicleNumber.length >= 3 && !matchedMasterVehicle;

  // Query Sales List
  const { data, isLoading, error } = useQuery<{ sales: Sale[]; totalCount: number }>({
    queryKey: [
      'salesList',
      search,
      selectedBuyer,
      vehicleFilter,
      vehicleTypeFilter,
      materialFilter,
      paymentCategoryFilter,
      driverFilter,
      operatorFilter,
      startDateTime,
      endDateTime,
      page,
      limit,
    ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedBuyer) params.set('buyerName', selectedBuyer);
      if (vehicleFilter) params.set('vehicleNumber', vehicleFilter);
      if (vehicleTypeFilter) params.set('vehicleType', vehicleTypeFilter);
      if (materialFilter) params.set('material', materialFilter);
      if (paymentCategoryFilter) params.set('paymentCategory', paymentCategoryFilter);
      if (driverFilter) params.set('driverName', driverFilter);
      if (isAdmin && operatorFilter) params.set('operatorId', operatorFilter);
      if (startDateTime) params.set('startDateTime', startDateTime);
      if (endDateTime) params.set('endDateTime', endDateTime);
      params.set('page', String(page));
      params.set('limit', String(limit));
      return apiClient<{ sales: Sale[]; totalCount: number }>(`/sales?${params.toString()}`);
    },
  });

  // Create Sale Mutation
  const createMutation = useMutation({
    mutationFn: (newSale: typeof formData) => {
      return apiClient('/sales', {
        method: 'POST',
        body: JSON.stringify({
          ...newSale,
          grossWeight: parseFloat(newSale.grossWeight),
          grossDateTime: newSale.grossDateTime ? new Date(newSale.grossDateTime).toISOString() : undefined,
          tareWeight: parseFloat(newSale.tareWeight),
          tareDateTime: newSale.tareDateTime ? new Date(newSale.tareDateTime).toISOString() : undefined,
          rate: parseFloat(newSale.rate) || 0,
          paymentCategory: newSale.paymentCategory,
          creditDebit: newSale.creditDebit || (newSale.paymentCategory === 'ACCOUNT' ? 'C' : 'D'),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesList'] });
      queryClient.invalidateQueries({ queryKey: ['overviewMetrics'] });
      setIsCreateOpen(false);
      setFormData({
        serialNumber: '',
        transactionDate: getNowLocalDateTime(),
        buyerName: '',
        gstin: '',
        vehicleNumber: '',
        vehicleType: '10 WHEELER',
        material: 'M-SAND',
        grossWeight: '',
        grossDateTime: getNowLocalDateTime(),
        tareWeight: '',
        tareDateTime: getNowLocalDateTime(),
        rate: '0',
        creditDebit: 'C',
        paymentCategory: 'ACCOUNT' as PaymentCategory,
        referenceNumber: '',
        remarks: '',
      });
      setTareRetrievedMessage(null);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Failed to record weight entry');
    },
  });

  // Cancel Sale Mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => {
      return apiClient(`/sales/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ cancellationReason: reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesList'] });
      queryClient.invalidateQueries({ queryKey: ['overviewMetrics'] });
      setCancelModalSale(null);
      setCancellationReason('');
    },
  });

  // Export CSV
  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedBuyer) params.set('buyerName', selectedBuyer);
    if (vehicleFilter) params.set('vehicleNumber', vehicleFilter);
    if (vehicleTypeFilter) params.set('vehicleType', vehicleTypeFilter);
    if (materialFilter) params.set('material', materialFilter);
    if (paymentCategoryFilter) params.set('paymentCategory', paymentCategoryFilter);
    if (driverFilter) params.set('driverName', driverFilter);
    if (isAdmin && operatorFilter) params.set('operatorId', operatorFilter);
    if (startDateTime) params.set('startDateTime', startDateTime);
    if (endDateTime) params.set('endDateTime', endDateTime);

    const blob = await apiClient<Blob>(`/sales/export/csv?${params.toString()}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weight_entry_list_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // 24-Hour Quick Filter preset
  const handleSet24HourFilter = () => {
    const now = new Date();
    const past24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const offset = now.getTimezoneOffset() * 60000;
    setStartDateTime(new Date(past24.getTime() - offset).toISOString().slice(0, 16));
    setEndDateTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    setPage(1);
  };

  // Weight validation and dynamic net weight calculation
  const hasGross = formData.grossWeight.trim() !== '' && !isNaN(Number(formData.grossWeight));
  const hasTare = formData.tareWeight.trim() !== '' && !isNaN(Number(formData.tareWeight));
  const grossNum = hasGross ? parseFloat(formData.grossWeight) : NaN;
  const tareNum = hasTare ? parseFloat(formData.tareWeight) : NaN;

  // Validation: Do not calculate or save valid net weight until required weights are available
  const areWeightsAvailable = hasGross && hasTare && grossNum > 0 && tareNum >= 0;
  const isWeightInvalid = areWeightsAvailable && grossNum < tareNum;
  const isWeightValid = areWeightsAvailable && grossNum >= tareNum;

  // Net Weight (Tons) = Gross Weight - Tare Weight
  const netWeightNum = isWeightValid ? grossNum - tareNum : null;
  const previewNet = isWeightValid && netWeightNum !== null ? netWeightNum.toFixed(3) : null;

  // Rate per Ton & Total Amount Calculation:
  // Net Weight (Tons) = Net Weight (KG) / 1000
  // Total Amount = Net Weight (Tons) × Rate per Ton
  const hasRate = formData.rate.trim() !== '' && !isNaN(Number(formData.rate));
  const rateNum = hasRate ? parseFloat(formData.rate) : NaN;
  const isRateValid = hasRate && rateNum >= 0;
  const isRateNegative = hasRate && rateNum < 0;

  // Financial accuracy: Calculate amount only when both net weight and rate are available
  const amountNum =
    isWeightValid && netWeightNum !== null && isRateValid
      ? Math.round((netWeightNum * rateNum + Number.EPSILON) * 100) / 100
      : null;
  const previewAmount = amountNum !== null ? amountNum.toFixed(2) : null;

  const canSubmitEntry =
    isWeightValid &&
    isRateValid &&
    formData.buyerName.trim() !== '' &&
    formData.vehicleNumber.trim() !== '' &&
    formData.material.trim() !== '';

  // Group entries by Sales Operator (Operator-wise grouping with subtotals)
  const operatorGroups: OperatorGroup[] = useMemo(() => {
    const groupsMap = new Map<string, OperatorGroup>();

    (data?.sales || []).forEach((sale) => {
      const opId = sale.createdBy?.id || 'unassigned';
      const opName = sale.createdBy?.name || 'Standard Operator';
      const opEmail = sale.createdBy?.email || '';

      if (!groupsMap.has(opId)) {
        groupsMap.set(opId, {
          operatorId: opId,
          operatorName: opName,
          operatorEmail: opEmail,
          sales: [],
          subtotalTare: 0,
          subtotalGross: 0,
          subtotalNet: 0,
          subtotalAmount: 0,
        });
      }

      const group = groupsMap.get(opId)!;
      group.sales.push(sale);
      if (!sale.isCancelled) {
        group.subtotalTare += Number(sale.tareWeight) || 0;
        group.subtotalGross += Number(sale.grossWeight) || 0;
        group.subtotalNet += Number(sale.netWeight) || 0;
        group.subtotalAmount += Number(sale.amount) || 0;
      }
    });

    return Array.from(groupsMap.values());
  }, [data?.sales]);

  // Overall Totals
  const activeSales = data?.sales.filter((s) => !s.isCancelled) || [];
  const overallTareTotal = activeSales.reduce((sum, s) => sum + Number(s.tareWeight), 0);
  const overallGrossTotal = activeSales.reduce((sum, s) => sum + Number(s.grossWeight), 0);
  const overallNetTotal = activeSales.reduce((sum, s) => sum + Number(s.netWeight), 0);
  const overallAmountTotal = activeSales.reduce((sum, s) => sum + Number(s.amount), 0);

  const selectedOperator = salesOperators.find((o) => o.id === operatorFilter);

  // Handle rapid form submit
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areWeightsAvailable) {
      setFormError('Please enter both Gross Weight and Tare Weight before recording.');
      return;
    }
    if (isWeightInvalid) {
      setFormError('Gross weight must be greater than or equal to Tare weight. Negative net weight is prohibited.');
      return;
    }
    if (!isRateValid) {
      setFormError('Rate per Ton must be a valid, non-negative monetary value.');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black flex items-center space-x-2">
            <Scale className="w-5 h-5 text-black" />
            <span>Weight Entry List 24Hour</span>
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Operational sales weighbridge register • Separate tare & gross verification • Operator-wise breakdown
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsQuickEntryOpen((prev) => !prev)}
            className="px-3 py-2 border border-black bg-white text-xs font-semibold uppercase text-black hover:bg-[#f3f4f6] flex items-center space-x-1.5 rounded-none shadow-subtle"
          >
            {isQuickEntryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isQuickEntryOpen ? 'Hide Entry Bar' : 'Quick Entry Bar'}</span>
          </button>
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
            <span>New Weight Entry</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        <div className="p-3 bg-white border border-[#e5e7eb] shadow-card">
          <div className="text-[10px] uppercase text-[#6b7280]">Total Gross Weight</div>
          <div className="text-base font-bold text-black mt-0.5">{overallGrossTotal.toFixed(3)} Tons</div>
          <div className="text-[10px] text-[#6b7280]">{activeSales.length} Active Weighments</div>
        </div>

        <div className="p-3 bg-white border border-[#e5e7eb] shadow-card">
          <div className="text-[10px] uppercase text-[#6b7280]">Total Tare Weight</div>
          <div className="text-base font-bold text-black mt-0.5">{overallTareTotal.toFixed(3)} Tons</div>
          <div className="text-[10px] text-[#6b7280]">Empty Truck Baseline</div>
        </div>

        <div className="p-3 bg-white border border-[#e5e7eb] shadow-card">
          <div className="text-[10px] uppercase text-[#6b7280]">Total Net Dispatched</div>
          <div className="text-base font-bold text-black mt-0.5">{overallNetTotal.toFixed(3)} Tons</div>
          <div className="text-[10px] text-[#6b7280]">Billed Material Net</div>
        </div>

        <div className="p-3 bg-black text-white border border-black shadow-card">
          <div className="text-[10px] uppercase text-[#9ca3af]">Total Billed Amount</div>
          <div className="text-base font-bold text-white mt-0.5">
            ₹{overallAmountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#d1d5db]">
            {selectedOperator ? `Operator: ${selectedOperator.name}` : (!isAdmin ? 'My Total Sales Revenue' : 'All Operators Combined')}
          </div>
        </div>
      </div>

      {/* Quick Weight Entry Workflow Form (Fast table-aligned operator data entry) */}
      {isQuickEntryOpen && (
        <div className="p-4 bg-white border-2 border-black shadow-card rounded-none">
          <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#e5e7eb]">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-black" />
              <span className="text-xs font-bold uppercase tracking-wider text-black font-mono">
                Rapid Weight Entry Terminal
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#6b7280]">
              Automatic Calculation: Net Wt = Gross Wt − Tare Wt
            </span>
          </div>

          {formError && (
            <div className="mb-3 p-2 border border-black bg-[#f3f4f6] text-black text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {tareRetrievedMessage && (
            <div className="mb-3 p-2 border border-black bg-[#f9fafb] text-black text-xs font-mono flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-black" />
                <span className="font-semibold">{tareRetrievedMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setTareRetrievedMessage(null)}
                className="text-[#6b7280] hover:text-black text-[10px] uppercase font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleQuickSubmit} className="space-y-3 font-mono">
            {/* Grid 1: Basic Identifiers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  S.No
                </label>
                <input
                  type="text"
                  placeholder="Auto"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Party Name *
                </label>
                <input
                  type="text"
                  required
                  list="quickBuyerList"
                  placeholder="Party / Client Name"
                  value={formData.buyerName}
                  onChange={(e) => {
                    const name = e.target.value;
                    const matched = buyers?.find((b) => b.name.toLowerCase() === name.toLowerCase());
                    setFormData({
                      ...formData,
                      buyerName: name,
                      gstin: matched?.gstin || formData.gstin,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none font-sans"
                />
                <datalist id="quickBuyerList">
                  {buyers?.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                    Vehicle No *
                  </label>
                  {matchedMasterVehicle && (
                    <span className="text-[9px] font-mono font-bold text-black bg-[#f3f4f6] px-1 border border-black">
                      Tare: {matchedMasterVehicle.tareWeight ?? 0}T
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  list="quickVehicleList"
                  placeholder="KA04..."
                  value={formData.vehicleNumber}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none uppercase font-mono"
                />
                <datalist id="quickVehicleList">
                  {vehicles?.map((v) => (
                    <option
                      key={v.id}
                      value={v.vehicleNumber}
                      label={v.tareWeight !== null && v.tareWeight !== undefined ? `Master Tare: ${v.tareWeight} T` : 'No Tare'}
                    />
                  ))}
                </datalist>
                {isVehicleMissingInMaster && (
                  <div className="flex items-center justify-between mt-1 text-[10px] text-black bg-[#f9fafb] px-1.5 py-0.5 border border-[#d1d5db]">
                    <span>Not in Master</span>
                    <button
                      type="button"
                      onClick={() => openRegisterVehicleModal(formData.vehicleNumber)}
                      className="font-bold underline text-black hover:text-blue-700 ml-1"
                    >
                      + Register
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none bg-white"
                >
                  {VEHICLE_TYPES.map((vt) => (
                    <option key={vt} value={vt}>
                      {vt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Material *
                </label>
                <input
                  type="text"
                  required
                  list="quickMaterialList"
                  placeholder="Material"
                  value={formData.material}
                  onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none"
                />
                <datalist id="quickMaterialList">
                  {COMMON_MATERIALS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Grid 2: Weights & Timestamps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 items-end pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                    Tare Wt (T) *
                  </label>
                  {matchedMasterVehicle?.tareWeight !== null && matchedMasterVehicle?.tareWeight !== undefined && (
                    <span className="text-[9px] font-mono text-black font-bold">Auto</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0.000"
                  value={formData.tareWeight}
                  onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none text-right font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                    Tare Date & Time
                  </label>
                  <span className="text-[9px] font-mono text-[#6b7280]">Weighed</span>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={formData.tareDateTime}
                  onChange={(e) => setFormData({ ...formData, tareDateTime: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Gross Wt (T) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="0.000"
                  value={formData.grossWeight}
                  onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none text-right font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                    Gross Date & Time
                  </label>
                  <span className="text-[9px] font-mono text-[#6b7280]">Weighed</span>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={formData.grossDateTime}
                  onChange={(e) => setFormData({ ...formData, grossDateTime: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none text-[11px]"
                />
              </div>

              <div className="bg-[#f3f4f6] border border-black p-1.5 min-w-[130px]">
                <div className="text-[9px] uppercase font-bold text-[#4b5563]">Net Weight (Auto)</div>
                {isWeightValid ? (
                  <div className="text-sm font-extrabold text-black font-mono">{previewNet} T</div>
                ) : isWeightInvalid ? (
                  <div className="text-xs font-bold text-red-600 font-mono">Gross &lt; Tare</div>
                ) : (
                  <div className="text-xs text-[#9ca3af] font-mono italic">Enter gross & tare</div>
                )}
              </div>
            </div>

            {/* Grid 3: Commercials — Rate, Total Amount, C-D & Reference */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end pt-1 border-t border-[#f3f4f6]">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase text-[#4b5563]">
                    Rate / Ton (₹) *
                  </label>
                  <span className="text-[9px] font-mono text-[#6b7280]">₹/Metric Ton</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className={`w-full px-2 py-1.5 text-xs border ${isRateNegative ? 'border-red-600 bg-red-50' : 'border-[#d1d5db]'} focus:outline-none focus:border-black rounded-none text-right font-bold`}
                />
              </div>

              <div className="bg-[#111827] text-white p-1.5 border border-black min-w-[130px]">
                <div className="text-[9px] uppercase font-bold text-[#9ca3af]">Total Amount (Auto)</div>
                {previewAmount !== null ? (
                  <div className="text-sm font-extrabold text-white font-mono">
                    ₹{parseFloat(previewAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                ) : isRateNegative ? (
                  <div className="text-xs font-bold text-red-400 font-mono">Negative Rate</div>
                ) : (
                  <div className="text-xs text-[#9ca3af] font-mono italic">Enter net &amp; rate</div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Payment Category
                </label>
                <select
                  value={formData.paymentCategory}
                  onChange={(e) => {
                    const cat = e.target.value as PaymentCategory;
                    setFormData({
                      ...formData,
                      paymentCategory: cat,
                      creditDebit: cat === 'ACCOUNT' ? 'C' : 'D',
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none bg-white font-bold"
                >
                  <option value="ACCOUNT">Credit</option>
                  <option value="CASH">Cash</option>
                  <option value="ONLINE">Online / UPI</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4b5563] mb-1">
                  Ref / Challan No
                </label>
                <input
                  type="text"
                  placeholder="Pass / Challan No"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] focus:outline-none focus:border-black rounded-none font-mono"
                />
              </div>
            </div>

            {/* Submit Bar */}
            <div className="pt-2 flex items-center justify-between border-t border-[#f3f4f6]">
              <div className="text-[11px] text-[#6b7280]">
                Logged in Operator: <span className="text-black font-bold">{user?.name || user?.email}</span>
                {isWeightInvalid && (
                  <span className="ml-3 text-red-600 font-bold">
                    Gross weight ({formData.grossWeight || 0}) cannot be less than tare weight ({formData.tareWeight || 0})
                  </span>
                )}
                {isRateNegative && (
                  <span className="ml-3 text-red-600 font-bold">
                    Rate per ton cannot be negative
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!canSubmitEntry || createMutation.isPending}
                title={
                  !canSubmitEntry
                    ? 'Please enter valid weights (Gross ≥ Tare > 0), non-negative rate, and required details'
                    : 'Record weight transaction'
                }
                className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Recording...' : 'Record Weight Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Operator Contribution Highlights Banner */}
      {isAdmin && operatorFilter && (
        <div className="p-4 bg-white border-2 border-black shadow-card rounded-none">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-black" />
              <div>
                <span className="text-[10px] font-mono uppercase text-[#6b7280] tracking-wider block">
                  Admin Operator Contribution Audit
                </span>
                <span className="text-sm font-bold text-black font-mono">
                  {selectedOperator ? `${selectedOperator.name} (${selectedOperator.email})` : 'Operator Filter Active'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Tare Subtotal</div>
                <div className="text-sm font-bold text-black">{overallTareTotal.toFixed(3)} T</div>
              </div>
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Gross Subtotal</div>
                <div className="text-sm font-bold text-black">{overallGrossTotal.toFixed(3)} T</div>
              </div>
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Net Contribution</div>
                <div className="text-sm font-bold text-black">{overallNetTotal.toFixed(3)} Tons</div>
              </div>
              <div className="px-3 py-1.5 bg-[#f9fafb] border border-[#d1d5db]">
                <div className="text-[9px] uppercase text-[#6b7280]">Entries</div>
                <div className="text-sm font-bold text-black">{activeSales.length} Records</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none space-y-3 font-mono">
        {/* Row 1: Search, Party, Vehicle, Vehicle Type, Material, C-D */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search challan, S.No, vehicle..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
            />
            <Search className="w-3.5 h-3.5 text-[#9ca3af] absolute left-2 top-2" />
          </div>

          {/* Party Filter */}
          <div>
            <select
              value={selectedBuyer}
              onChange={(e) => {
                setSelectedBuyer(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
            >
              <option value="">All Parties</option>
              {buyers?.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Number filter */}
          <div>
            <input
              type="text"
              placeholder="Filter Vehicle No..."
              value={vehicleFilter}
              onChange={(e) => {
                setVehicleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
            />
          </div>

          {/* Vehicle Type filter */}
          <div>
            <select
              value={vehicleTypeFilter}
              onChange={(e) => {
                setVehicleTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
            >
              <option value="">All Vehicle Types</option>
              {VEHICLE_TYPES.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>

          {/* Material filter */}
          <div>
            <select
              value={materialFilter}
              onChange={(e) => {
                setMaterialFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
            >
              <option value="">All Materials</option>
              {COMMON_MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Category filter */}
          <div>
            <select
              value={paymentCategoryFilter}
              onChange={(e) => {
                setPaymentCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
            >
              <option value="">All Payment Categories</option>
              <option value="ACCOUNT">Credit</option>
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online / UPI</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date & Time Filters, 24-Hour Preset, and Admin Operator Filter */}
        <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2 items-center`}>
          <div>
            <label className="block text-[9px] uppercase text-[#6b7280] mb-0.5">Start Date & Time (IST)</label>
            <input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => {
                setStartDateTime(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-[11px]"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase text-[#6b7280] mb-0.5">End Date & Time (IST)</label>
            <input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => {
                setEndDateTime(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-[11px]"
            />
          </div>

          <div className="flex items-end space-x-1.5 pt-3">
            <button
              onClick={handleSet24HourFilter}
              className="w-full py-1.5 px-2 bg-black text-white text-[11px] font-bold uppercase hover:bg-[#1f2937] flex items-center justify-center space-x-1"
            >
              <Clock className="w-3 h-3" />
              <span>24-Hour Shift View</span>
            </button>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-[9px] uppercase text-[#6b7280] mb-0.5">Sales Operator</label>
              <select
                value={operatorFilter}
                onChange={(e) => {
                  setOperatorFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-2 py-1.5 text-xs border border-black font-semibold rounded-none focus:outline-none bg-white text-black"
              >
                <option value="">All Sales Operators</option>
                {salesOperators.map((op) => (
                  <option key={op.id} value={op.id}>
                    Operator: {op.name} ({op.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Clear Filters bar */}
        {(search ||
          selectedBuyer ||
          vehicleFilter ||
          vehicleTypeFilter ||
          materialFilter ||
          paymentCategoryFilter ||
          driverFilter ||
          operatorFilter ||
          startDateTime ||
          endDateTime) && (
            <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6]">
              <span className="text-[10px] text-[#6b7280] uppercase">Active filter constraints applied</span>
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedBuyer('');
                  setVehicleFilter('');
                  setVehicleTypeFilter('');
                  setMaterialFilter('');
                  setPaymentCategoryFilter('');
                  setDriverFilter('');
                  setOperatorFilter('');
                  setStartDateTime('');
                  setEndDateTime('');
                  setPage(1);
                }}
                className="py-1 px-3 text-[10px] font-mono uppercase border border-[#d1d5db] text-[#4b5563] hover:text-black bg-[#f9fafb]"
              >
                Clear All Filters
              </button>
            </div>
          )}
      </div>

      {/* Weight Entry List 24Hour Table */}
      <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden font-mono">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#6b7280]">Loading weight entry records...</div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-black">Error loading records: {(error as any).message}</div>
        ) : data?.sales.length === 0 ? (
          <div className="p-16 text-center text-xs text-[#6b7280]">
            No weight entries found matching query criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f9fafb] border-b-2 border-black text-[10px] uppercase text-black font-bold">
                <tr>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">S.No</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Party Name</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Vehicle Number</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Material</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">Tare Wt (T)</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Tare Date & Time</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">Gross Wt (T)</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Gross Date & Time</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">Net Wt (T)</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">Rate (₹/T)</th>
                  <th className="py-2.5 px-3 text-right border-r border-[#e5e7eb]">Amount (₹)</th>
                  <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Vehicle Type</th>
                  <th className="py-2.5 px-3 text-center border-r border-[#e5e7eb]">Payment</th>
                  {isAdmin && <th className="py-2.5 px-3 border-r border-[#e5e7eb]">Operator</th>}
                  <th className="py-2.5 px-3 text-center border-r border-[#e5e7eb]">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>

              {/* Operator-wise Grouped Body */}
              <tbody className="divide-y divide-[#e5e7eb]">
                {operatorGroups.map((group) => (
                  <React.Fragment key={group.operatorId}>
                    {/* Operator Group Header Row */}
                    <tr className="bg-[#111827] text-white">
                      <td
                        colSpan={isAdmin ? 16 : 15}
                        className="py-2 px-3 text-xs uppercase tracking-wider font-bold"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span>OPERATOR: {group.operatorName}</span>
                            {group.operatorEmail && (
                              <span className="text-[#9ca3af] text-[10px] font-normal">
                                ({group.operatorEmail})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#d1d5db]">
                            {group.sales.filter((s) => !s.isCancelled).length} Active Entries
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Operator Entries */}
                    {group.sales.map((sale, idx) => (
                      <tr
                        key={sale.id}
                        className={`hover:bg-[#f9fafb] transition-colors border-b border-[#f3f4f6] ${sale.isCancelled ? 'opacity-50 bg-[#f9fafb]' : ''
                          }`}
                      >
                        <td className="py-2 px-3 font-bold text-black border-r border-[#f3f4f6]">
                          {sale.serialNumber || idx + 1}
                        </td>
                        <td className="py-2 px-3 font-medium text-black border-r border-[#f3f4f6]">
                          <div>{sale.buyerName}</div>
                          {sale.gstin && (
                            <div className="text-[9px] text-[#9ca3af]">GST: {sale.gstin}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-black border-r border-[#f3f4f6]">
                          {sale.vehicleNumber}
                        </td>
                        <td className="py-2 px-3 text-[#4b5563] border-r border-[#f3f4f6]">
                          {sale.material}
                        </td>
                        <td className="py-2 px-3 text-right text-[#4b5563] border-r border-[#f3f4f6]">
                          {Number(sale.tareWeight).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-[#6b7280] border-r border-[#f3f4f6]">
                          {format24HourDateTime(sale.tareDateTime || sale.transactionDate)}
                        </td>
                        <td className="py-2 px-3 text-right text-[#4b5563] border-r border-[#f3f4f6]">
                          {Number(sale.grossWeight).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-[#6b7280] border-r border-[#f3f4f6]">
                          {format24HourDateTime(sale.grossDateTime || sale.transactionDate)}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-black bg-[#f9fafb] border-r border-[#f3f4f6]">
                          {Number(sale.netWeight).toFixed(3)}
                        </td>
                        <td className="py-2 px-3 text-right text-black font-mono border-r border-[#f3f4f6]">
                          ₹{Number(sale.rate || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-extrabold text-black font-mono bg-[#f9fafb] border-r border-[#f3f4f6]">
                          ₹{Number(sale.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-[#4b5563] text-[11px] border-r border-[#f3f4f6]">
                          {sale.vehicleType || '—'}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-[#f3f4f6]">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold border ${
                              sale.paymentCategory === 'ACCOUNT' || sale.creditDebit === 'C'
                                ? 'bg-black text-white border-black'
                                : sale.paymentCategory === 'ONLINE'
                                ? 'bg-[#1e293b] text-white border-[#1e293b]'
                                : sale.paymentCategory === 'CHEQUE'
                                ? 'bg-[#374151] text-white border-[#374151]'
                                : 'bg-[#f3f4f6] text-black border-[#d1d5db]'
                            }`}
                          >
                            {sale.paymentCategory === 'ACCOUNT' || sale.creditDebit === 'C'
                              ? 'CREDIT'
                              : sale.paymentCategory === 'ONLINE'
                              ? 'ONLINE / UPI'
                              : sale.paymentCategory === 'CHEQUE'
                              ? 'CHEQUE'
                              : 'CASH'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-2 px-3 text-[#6b7280] text-[11px] border-r border-[#f3f4f6]">
                            {sale.createdBy ? sale.createdBy.name : '—'}
                          </td>
                        )}
                        <td className="py-2 px-3 text-center border-r border-[#f3f4f6]">
                          {sale.isCancelled ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-black text-white">CANCELLED</span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] border border-[#e5e7eb] text-[#4b5563]">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {!sale.isCancelled && (
                            <button
                              onClick={() => setCancelModalSale(sale)}
                              className="p-1 text-[#6b7280] hover:text-black border border-transparent hover:border-[#d1d5db]"
                              title="Cancel transaction"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Operator Subtotal Row */}
                    <tr className="bg-[#f3f4f6] border-y-2 border-[#d1d5db] font-bold text-xs text-black">
                      <td colSpan={4} className="py-2.5 px-3 uppercase text-[10px] text-black">
                        Subtotal for {group.operatorName} ({group.sales.filter((s) => !s.isCancelled).length} Active Records)
                      </td>
                      <td className="py-2.5 px-3 text-right text-black font-bold">
                        {group.subtotalTare.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-[#9ca3af]">Tare Subtotal</td>
                      <td className="py-2.5 px-3 text-right text-black font-bold">
                        {group.subtotalGross.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-[#9ca3af]">Gross Subtotal</td>
                      <td className="py-2.5 px-3 text-right text-black font-extrabold bg-[#e5e7eb]">
                        {group.subtotalNet.toFixed(3)} T
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-[#9ca3af]">—</td>
                      <td className="py-2.5 px-3 text-right text-black font-extrabold bg-[#e5e7eb]">
                        ₹{group.subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={isAdmin ? 5 : 4} className="py-2.5 px-3 text-right text-[10px] text-[#6b7280]">
                        Subtotal: {group.subtotalNet.toFixed(3)} T • ₹{group.subtotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>

              {/* Overall Grand Totals Footer */}
              <tfoot className="bg-black text-white font-bold text-xs border-t-4 border-black">
                <tr>
                  <td colSpan={4} className="py-3 px-3 uppercase text-xs tracking-wider">
                    GRAND TOTAL ({isAdmin ? 'ALL OPERATORS' : 'MY RECORDS'} — {activeSales.length} ACTIVE TRANSACTIONS)
                  </td>
                  <td className="py-3 px-3 text-right text-sm">
                    {overallTareTotal.toFixed(3)} T
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right text-sm">
                    {overallGrossTotal.toFixed(3)} T
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right text-sm font-extrabold bg-[#1f2937]">
                    {overallNetTotal.toFixed(3)} T
                  </td>
                  <td className="text-center text-[11px] text-[#9ca3af]">—</td>
                  <td className="py-3 px-3 text-right text-sm font-extrabold bg-[#1f2937]">
                    ₹{overallAmountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={isAdmin ? 5 : 4} className="py-3 px-3 text-right text-[11px] text-[#d1d5db]">
                    Total Revenue: ₹{overallAmountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalCount > limit && (
          <div className="p-3 border-t border-[#e5e7eb] flex items-center justify-between text-xs text-[#6b7280] bg-[#f9fafb]">
            <div>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.totalCount)} of {data.totalCount} records
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

      {/* New Weight Entry Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-mono">
          <div className="bg-white border border-[#e5e7eb] max-w-2xl w-full p-6 shadow-elevated rounded-none max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-black flex items-center space-x-2">
                <Scale className="w-4 h-4 text-black" />
                <span>Create New Weight Entry Record</span>
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

            {tareRetrievedMessage && (
              <div className="mb-3 p-2 border border-black bg-[#f9fafb] text-black text-xs font-mono flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span className="font-semibold">{tareRetrievedMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTareRetrievedMessage(null)}
                  className="text-[#6b7280] hover:text-black text-[10px] uppercase font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!areWeightsAvailable) {
                  setFormError('Please enter both Gross Weight and Tare Weight before recording.');
                  return;
                }
                if (isWeightInvalid) {
                  setFormError('Gross weight must be greater than or equal to Tare weight. Negative net weight is prohibited.');
                  return;
                }
                if (!isRateValid) {
                  setFormError('Rate per Ton must be a valid, non-negative monetary value.');
                  return;
                }
                createMutation.mutate(formData);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Serial Number (S.No)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101 (optional, auto-generated)"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Transaction Date & Time (IST)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.transactionDate}
                    onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Party Name *
                  </label>
                  <input
                    type="text"
                    required
                    list="modalBuyerOptions"
                    value={formData.buyerName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const matched = buyers?.find((b) => b.name.toLowerCase() === name.toLowerCase());
                      setFormData({
                        ...formData,
                        buyerName: name,
                        gstin: matched?.gstin || formData.gstin,
                      });
                    }}
                    placeholder="Party / Client / Buyer"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                  <datalist id="modalBuyerOptions">
                    {buyers?.map((b) => (
                      <option key={b.id} value={b.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-black uppercase">
                      Vehicle Number *
                    </label>
                    {matchedMasterVehicle && (
                      <span className="text-[9px] font-mono font-bold text-black bg-[#f3f4f6] px-1 border border-black">
                        Master Tare: {matchedMasterVehicle.tareWeight ?? 0}T
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    list="modalVehicleOptions"
                    value={formData.vehicleNumber}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    placeholder="KA01AB1234"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black uppercase font-mono"
                  />
                  <datalist id="modalVehicleOptions">
                    {vehicles?.map((v) => (
                      <option
                        key={v.id}
                        value={v.vehicleNumber}
                        label={v.tareWeight !== null && v.tareWeight !== undefined ? `Master Tare: ${v.tareWeight} T` : 'No Tare'}
                      />
                    ))}
                  </datalist>
                  {isVehicleMissingInMaster && (
                    <div className="flex items-center justify-between mt-1 text-[10px] text-black bg-[#f9fafb] px-1.5 py-0.5 border border-[#d1d5db]">
                      <span>Not in Master</span>
                      <button
                        type="button"
                        onClick={() => openRegisterVehicleModal(formData.vehicleNumber)}
                        className="font-bold underline text-black hover:text-blue-700 ml-1"
                      >
                        + Register
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white"
                  >
                    {VEHICLE_TYPES.map((vt) => (
                      <option key={vt} value={vt}>
                        {vt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Material *
                  </label>
                  <input
                    type="text"
                    required
                    list="modalMaterialOptions"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="e.g. M-SAND"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                  <datalist id="modalMaterialOptions">
                    {COMMON_MATERIALS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Weights and Timestamps Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 border border-[#d1d5db] bg-[#f9fafb] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-1">
                    <span className="text-[10px] font-bold uppercase text-black">
                      Tare Weighment
                    </span>
                    {matchedMasterVehicle?.tareWeight !== null && matchedMasterVehicle?.tareWeight !== undefined && (
                      <span className="text-[9px] font-mono text-black font-bold">
                        Auto-Retrieved
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#4b5563] uppercase mb-0.5">
                      Tare Wt (Tons) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.tareWeight}
                      onChange={(e) => setFormData({ ...formData, tareWeight: e.target.value })}
                      placeholder="10.200"
                      className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-right font-bold bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-[#4b5563] uppercase">
                        Tare Date & Time (IST)
                      </label>
                      <span className="text-[9px] text-[#6b7280]">Actual Weighing</span>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={formData.tareDateTime}
                      onChange={(e) => setFormData({ ...formData, tareDateTime: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-[11px] bg-white"
                    />
                  </div>
                </div>

                <div className="p-3 border border-[#d1d5db] bg-[#f9fafb] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-1">
                    <span className="text-[10px] font-bold uppercase text-black">
                      Gross Weighment
                    </span>
                    <span className="text-[9px] text-[#6b7280]">Operator Input</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#4b5563] uppercase mb-0.5">
                      Gross Wt (Tons) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.grossWeight}
                      onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                      placeholder="35.500"
                      className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-right font-bold bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] font-semibold text-[#4b5563] uppercase">
                        Gross Date & Time (IST)
                      </label>
                      <span className="text-[9px] text-[#6b7280]">Actual Weighing</span>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={formData.grossDateTime}
                      onChange={(e) => setFormData({ ...formData, grossDateTime: e.target.value })}
                      className="w-full px-2 py-1 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-[11px] bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic Calculation Preview Strip */}
              <div className="p-3 border-2 border-black bg-white flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-[10px] text-[#6b7280] uppercase">Calculated Net Weight (Gross − Tare)</div>
                  {isWeightValid ? (
                    <div className="text-base font-extrabold text-black">{previewNet} Tons</div>
                  ) : isWeightInvalid ? (
                    <div className="text-xs font-bold text-red-600">Invalid: Gross Wt &lt; Tare Wt</div>
                  ) : (
                    <div className="text-xs text-[#9ca3af] italic">Enter gross and tare weights</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#6b7280] uppercase">Estimated Billed Total</div>
                  <div className="text-base font-extrabold text-black">
                    {isWeightValid && previewAmount !== null
                      ? `₹${parseFloat(previewAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Payment Category
                  </label>
                  <select
                    value={formData.paymentCategory}
                    onChange={(e) => {
                      const cat = e.target.value as PaymentCategory;
                      setFormData({
                        ...formData,
                        paymentCategory: cat,
                        creditDebit: cat === 'ACCOUNT' ? 'C' : 'D',
                      });
                    }}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black bg-white font-bold"
                  >
                    <option value="ACCOUNT">Credit</option>
                    <option value="CASH">Cash</option>
                    <option value="ONLINE">Online / UPI</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Rate / Ton (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black text-right"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Ref / Challan No
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="Challan / Pass"
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Remarks / Notes
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional weighbridge notes"
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
                  disabled={!canSubmitEntry || createMutation.isPending}
                  title={
                    !canSubmitEntry
                      ? 'Please enter valid weights (Gross ≥ Tare > 0) and required details'
                      : 'Record weight transaction'
                  }
                  className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Validating...' : 'Record Weight Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Vehicle Master Registration Modal */}
      {isVehicleRegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-mono">
          <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-elevated rounded-none">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-black" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                  Register Vehicle in Master Data
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsVehicleRegModalOpen(false);
                  setVehicleRegError(null);
                }}
                className="text-black hover:bg-[#f3f4f6] p-1 border border-transparent hover:border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4b5563] mb-4">
              Store vehicle number and standard registered tare weight centrally. Future weighments will automatically retrieve this tare weight.
            </p>

            {vehicleRegError && (
              <div className="mb-4 p-2.5 border border-black bg-[#f3f4f6] text-black text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{vehicleRegError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newVehicleData.vehicleNumber.trim()) {
                  setVehicleRegError('Vehicle Number is required');
                  return;
                }
                registerVehicleMutation.mutate(newVehicleData);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KA04AB1234"
                  value={newVehicleData.vehicleNumber}
                  onChange={(e) =>
                    setNewVehicleData({
                      ...newVehicleData,
                      vehicleNumber: e.target.value.toUpperCase().replace(/\s+/g, ''),
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                  Registered Tare Weight (Tons) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="e.g. 10.500"
                  value={newVehicleData.tareWeight}
                  onChange={(e) =>
                    setNewVehicleData({ ...newVehicleData, tareWeight: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black font-bold text-right"
                />
                <span className="text-[10px] text-[#6b7280] mt-0.5 block">
                  Central tare weight for automatic retrieval during sales entry.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Driver Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Driver Name"
                    value={newVehicleData.driverName}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, driverName: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-black uppercase mb-1">
                    Driver Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={newVehicleData.driverPhone}
                    onChange={(e) =>
                      setNewVehicleData({ ...newVehicleData, driverPhone: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e5e7eb] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsVehicleRegModalOpen(false);
                    setVehicleRegError(null);
                  }}
                  className="px-4 py-2 border border-[#d1d5db] text-xs font-semibold uppercase text-black hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerVehicleMutation.isPending}
                  className="px-5 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1f2937] disabled:opacity-50"
                >
                  {registerVehicleMutation.isPending ? 'Saving to Master...' : 'Register in Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-mono">
          <div className="bg-white border border-[#e5e7eb] max-w-sm w-full p-6 shadow-elevated rounded-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-2 flex items-center space-x-1.5">
              <Ban className="w-4 h-4 text-black" />
              <span>Cancel Weight Entry Record</span>
            </h3>
            <p className="text-xs text-[#4b5563] mb-4">
              This action is permanent and auditable. The entry will be marked as cancelled in the 24Hour ledger.
            </p>

            <div className="mb-4 p-2.5 bg-[#f9fafb] border border-[#e5e7eb] text-[11px]">
              <div>S.No: {cancelModalSale.serialNumber || '—'}</div>
              <div>Party: {cancelModalSale.buyerName}</div>
              <div>Vehicle: {cancelModalSale.vehicleNumber}</div>
              <div>Net Weight: {Number(cancelModalSale.netWeight).toFixed(3)} Tons</div>
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
                placeholder="e.g. Weighbridge calibration error / Order rejected"
                className="w-full p-2 text-xs border border-[#d1d5db] rounded-none focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setCancelModalSale(null)}
                className="px-3 py-1.5 border border-[#d1d5db] text-xs font-semibold text-black hover:bg-[#f3f4f6]"
              >
                Keep Record
              </button>
              <button
                disabled={!cancellationReason.trim() || cancelMutation.isPending}
                onClick={() =>
                  cancelMutation.mutate({
                    id: cancelModalSale.id,
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
