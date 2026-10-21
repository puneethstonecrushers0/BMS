import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { Buyer } from '../../types';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Scale,
  Receipt,
  AlertCircle,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'sales' | 'boulders' | 'business'>('sales');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [paymentCategory, setPaymentCategory] = useState('');

  // Fetch buyers for filter
  const { data: buyers } = useQuery<Buyer[]>({
    queryKey: ['buyersList'],
    queryFn: () => apiClient<Buyer[]>('/references/buyers'),
  });

  // Daily Sales Report Query
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['reportSales', startDate, endDate, selectedBuyer, paymentCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (selectedBuyer) params.set('buyerName', selectedBuyer);
      if (paymentCategory) params.set('paymentCategory', paymentCategory);
      return apiClient<any>(`/reports/sales?${params.toString()}`);
    },
    enabled: reportType === 'sales',
  });

  // Daily Boulder Report Query
  const { data: boulderReport, isLoading: boulderLoading } = useQuery({
    queryKey: ['reportBoulders', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient<any>(`/reports/boulders?${params.toString()}`);
    },
    enabled: reportType === 'boulders',
  });

  // Consolidated Business Summary Query
  const { data: businessSummary, isLoading: businessLoading } = useQuery({
    queryKey: ['reportBusinessSummary', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient<any>(`/reports/business-summary?${params.toString()}`);
    },
    enabled: reportType === 'business',
  });

  // Export CSV
  const handleExportCsv = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (selectedBuyer) params.set('buyerName', selectedBuyer);
    if (paymentCategory) params.set('paymentCategory', paymentCategory);

    const blob = await apiClient<Blob>(`/reports/export/sales-csv?${params.toString()}`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${startDate}_to_${endDate}${selectedBuyer ? `_${selectedBuyer}` : ''}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: string | number) => {
    const num = parseFloat(String(val || 0));
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Report Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black">
            Business Statements & Daily Reports
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Audit-grade business reconciliations grouped in Indian Standard Time (IST)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {reportType === 'sales' && (
            <button
              onClick={handleExportCsv}
              className="px-3 py-2 border border-[#d1d5db] bg-white text-xs font-semibold uppercase text-black hover:bg-[#f3f4f6] flex items-center space-x-1.5 rounded-none shadow-subtle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Controls & Report Type Tabs */}
      <div className="p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => setReportType('sales')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-none ${
                reportType === 'sales'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#4b5563] border-[#d1d5db] hover:bg-[#f9fafb]'
              }`}
            >
              Daily Sales Report
            </button>
            <button
              onClick={() => setReportType('boulders')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-none ${
                reportType === 'boulders'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#4b5563] border-[#d1d5db] hover:bg-[#f9fafb]'
              }`}
            >
              Daily Boulder Report
            </button>
            <button
              onClick={() => setReportType('business')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border rounded-none ${
                reportType === 'business'
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-[#4b5563] border-[#d1d5db] hover:bg-[#f9fafb]'
              }`}
            >
              Consolidated Summary
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#6b7280]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black"
            />
            <span className="text-xs text-[#6b7280]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black"
            />
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="px-2 py-1 text-[11px] font-mono border border-[#d1d5db] text-[#4b5563] hover:text-black bg-[#f9fafb]"
            >
              Today
            </button>
          </div>
        </div>

        {/* Sales-specific Buyer & Credit Filters */}
        {reportType === 'sales' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#f3f4f6]">
            <div className="w-64">
              <label className="block text-[10px] uppercase font-mono text-[#6b7280] mb-0.5">
                Filter by Buyer / Client
              </label>
              <select
                value={selectedBuyer}
                onChange={(e) => setSelectedBuyer(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black bg-white"
              >
                <option value="">All Buyers (All Clients)</option>
                {buyers?.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-64">
              <label className="block text-[10px] uppercase font-mono text-[#6b7280] mb-0.5">
                Payment Category (Credit / Cash)
              </label>
              <select
                value={paymentCategory}
                onChange={(e) => setPaymentCategory(e.target.value)}
                className="w-full px-2.5 py-1 text-xs border border-[#d1d5db] font-mono rounded-none focus:outline-none focus:border-black bg-white"
              >
                <option value="">All Payment Categories</option>
                <option value="ACCOUNT">ACCOUNT / CREDIT (Pay Later — Unpaid)</option>
                <option value="CASH">CASH (Paid Immediately)</option>
                <option value="ONLINE">ONLINE (UPI / NEFT Transfer)</option>
                <option value="CHEQUE">CHEQUE (Bank Deposit)</option>
              </select>
            </div>

            {(selectedBuyer || paymentCategory) && (
              <div className="self-end pb-0.5">
                <button
                  onClick={() => {
                    setSelectedBuyer('');
                    setPaymentCategory('');
                  }}
                  className="px-2.5 py-1 text-xs font-mono border border-[#d1d5db] text-[#4b5563] hover:text-black bg-[#f9fafb]"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Render Selected Report View */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          {salesLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6b7280] bg-white border border-[#e5e7eb]">
              Compiling sales statement...
            </div>
          ) : salesReport ? (
            <>
              {/* Financial Distinction Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#e5e7eb] p-4 shadow-card rounded-none">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                    Total Recorded Sales
                  </div>
                  <div className="text-xl font-bold font-mono text-black mt-1">
                    {formatCurrency(salesReport.summary.totalSalesAmount)}
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] mt-1">
                    Gross volume across all {salesReport.summary.totalSalesCount} entries
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] p-4 shadow-card rounded-none">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black">
                    Direct Collected Funds (Cash/Online/Cheque)
                  </div>
                  <div className="text-xl font-bold font-mono text-black mt-1">
                    {formatCurrency(salesReport.summary.directCollectedAmount)}
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] mt-1">
                    Cleared receipts verified
                  </div>
                </div>

                <div className="bg-white border border-black p-4 shadow-card rounded-none bg-[#f9fafb]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black">
                    Account / Credit Sales (Receivables)
                  </div>
                  <div className="text-xl font-bold font-mono text-black mt-1">
                    {formatCurrency(salesReport.summary.accountCreditSalesAmount)}
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] mt-1">
                    Outstanding trade credit (Not yet collected)
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
                <div className="p-3 border-b border-[#e5e7eb] bg-[#f9fafb] text-xs font-bold uppercase tracking-wider text-black">
                  Detailed Sales Line Items
                </div>
                {salesReport.sales.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[#6b7280]">
                    No sales recorded for this date range.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Buyer Name</th>
                          <th className="py-2.5 px-3">Vehicle</th>
                          <th className="py-2.5 px-3">Material</th>
                          <th className="py-2.5 px-3 text-right">Net Wt (Tons)</th>
                          <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          <th className="py-2.5 px-3 text-center">Payment Instrument</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f3f4f6]">
                        {salesReport.sales.map((s: any) => (
                          <tr key={s.id} className="hover:bg-[#f9fafb]">
                            <td className="py-2 px-3 font-mono text-[#4b5563]">
                              {new Date(s.transactionDate).toLocaleDateString('en-IN')}
                            </td>
                            <td className="py-2 px-3 font-semibold text-black">{s.buyerName}</td>
                            <td className="py-2 px-3 font-mono text-[#4b5563]">{s.vehicleNumber}</td>
                            <td className="py-2 px-3 text-[#4b5563]">{s.material}</td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-black">
                              {Number(s.netWeight).toFixed(3)}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-[#6b7280]">
                              ₹{Number(s.rate).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 font-mono text-right font-bold text-black">
                              ₹{Number(s.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#d1d5db] bg-[#f9fafb] text-black">
                                {s.paymentCategory}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {reportType === 'boulders' && (
        <div className="space-y-6">
          {boulderLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6b7280] bg-white border border-[#e5e7eb]">
              Compiling boulder intake statement...
            </div>
          ) : boulderReport ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-[#e5e7eb] p-4 shadow-card rounded-none">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                    Total Boulder Tonnage
                  </div>
                  <div className="text-xl font-bold font-mono text-black mt-1">
                    {Number(boulderReport.summary.totalBoulderTonnage).toFixed(3)} Tons
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] mt-1">
                    Total quarry raw stone intake
                  </div>
                </div>

                <div className="bg-white border border-[#e5e7eb] p-4 shadow-card rounded-none">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                    Total Boulder Trips
                  </div>
                  <div className="text-xl font-bold font-mono text-black mt-1">
                    {boulderReport.summary.totalTripCount} Trips
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280] mt-1">
                    Weighbridge trip vouchers recorded
                  </div>
                </div>
              </div>

              {/* Supplier Breakdown Table */}
              <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none overflow-hidden">
                <div className="p-3 border-b border-[#e5e7eb] bg-[#f9fafb] text-xs font-bold uppercase tracking-wider text-black">
                  Supplier / Quarry Pit Summary
                </div>
                {boulderReport.summary.supplierBreakdown.length === 0 ? (
                  <div className="p-12 text-center text-xs font-mono text-[#6b7280]">
                    No boulder trips recorded for this date range.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                      <tr>
                        <th className="py-2.5 px-4">Supplier / Quarry Pit</th>
                        <th className="py-2.5 px-4 text-right">Trip Count</th>
                        <th className="py-2.5 px-4 text-right">Total Net Weight (Tons)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      {boulderReport.summary.supplierBreakdown.map((sb: any) => (
                        <tr key={sb.supplier} className="hover:bg-[#f9fafb]">
                          <td className="py-2.5 px-4 font-semibold text-black">{sb.supplier}</td>
                          <td className="py-2.5 px-4 font-mono text-right">{sb.tripCount} trips</td>
                          <td className="py-2.5 px-4 font-mono text-right font-bold text-black">
                            {Number(sb.totalNetWeight).toFixed(3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {reportType === 'business' && (
        <div className="space-y-6">
          {businessLoading ? (
            <div className="p-12 text-center text-xs font-mono text-[#6b7280] bg-white border border-[#e5e7eb]">
              Compiling executive consolidated reconciliation...
            </div>
          ) : businessSummary ? (
            <div className="bg-white border border-[#e5e7eb] shadow-card rounded-none p-6 space-y-6">
              <div className="border-b border-[#e5e7eb] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  Consolidated Material Balance Reconciliation
                </h3>
                <p className="text-[11px] font-mono text-[#6b7280]">
                  Period: {startDate} to {endDate}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-[#e5e7eb] bg-[#f9fafb]">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Quarry Intake (Boulders)</div>
                  <div className="text-lg font-bold font-mono text-black mt-1">
                    {Number(businessSummary.boulderSummary.totalBoulderTonnage).toFixed(3)} Tons
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280]">
                    {businessSummary.boulderSummary.totalTripCount} Trips
                  </div>
                </div>

                <div className="p-4 border border-[#e5e7eb] bg-[#f9fafb]">
                  <div className="text-[10px] font-bold uppercase text-[#6b7280]">Outbound Sales Dispatched</div>
                  <div className="text-lg font-bold font-mono text-black mt-1">
                    {Number(businessSummary.salesSummary.totalNetWeightTons).toFixed(3)} Tons
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280]">
                    {businessSummary.salesSummary.totalSalesCount} Transactions
                  </div>
                </div>

                <div className="p-4 border border-black bg-white">
                  <div className="text-[10px] font-bold uppercase text-black">Net Mass Balance (Intake - Sales)</div>
                  <div className="text-lg font-bold font-mono text-black mt-1">
                    {Number(businessSummary.netMaterialDifferenceTons).toFixed(3)} Tons
                  </div>
                  <div className="text-[10px] font-mono text-[#6b7280]">Stock accumulation or processing delta</div>
                </div>
              </div>

              <div className="border-t border-[#e5e7eb] pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-black mb-3">
                  Period Revenue Reconciliation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 border border-[#e5e7eb] flex justify-between items-center text-xs">
                    <span className="font-semibold text-black">Direct Liquid Collected (Cash/Bank/Cheque):</span>
                    <span className="font-mono font-bold text-black">
                      {formatCurrency(businessSummary.salesSummary.directCollectedAmount)}
                    </span>
                  </div>
                  <div className="p-3 border border-[#e5e7eb] flex justify-between items-center text-xs">
                    <span className="font-semibold text-black">Trade Credit Outstanding (Account):</span>
                    <span className="font-mono font-bold text-black">
                      {formatCurrency(businessSummary.salesSummary.accountCreditSalesAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
