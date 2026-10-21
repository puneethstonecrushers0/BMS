import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  DollarSign,
  Scale,
  Truck,
  Layers,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OverviewData {
  period: { startDate: string | null; endDate: string | null };
  sales: {
    count: number;
    totalAmount: string;
    totalNetWeight: string;
    paymentBreakdown: Record<string, { count: number; amount: string; netWeight: string }>;
  };
  boulders: {
    count: number;
    totalNetWeight: string;
  };
  recentSales: Array<{
    id: string;
    transactionDate: string;
    buyerName: string;
    vehicleNumber: string;
    netWeight: number | string;
    amount: number | string;
    paymentCategory: string;
  }>;
  recentTrips: Array<{
    id: string;
    tripDate: string;
    supplierOrOperator: string;
    vehicleNumber: string;
    netWeight: number | string;
  }>;
}

export const OverviewPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error } = useQuery<OverviewData>({
    queryKey: ['overviewMetrics', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient<OverviewData>(`/analytics/overview?${params.toString()}`);
    },
  });

  const formatCurrency = (val: string | number) => {
    const num = parseFloat(String(val || 0));
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (val: string | number) => {
    const num = parseFloat(String(val || 0));
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Top filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black">
            Executive Business Summary
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Key operational metrics calculated from verified ledger records
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-[#6b7280]" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs border border-[#d1d5db] px-2.5 py-1.5 bg-white font-mono rounded-none focus:outline-none focus:border-black"
          />
          <span className="text-xs text-[#6b7280]">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs border border-[#d1d5db] px-2.5 py-1.5 bg-white font-mono rounded-none focus:outline-none focus:border-black"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="px-2 py-1 text-[11px] font-mono border border-[#d1d5db] text-[#4b5563] hover:text-black bg-[#f9fafb]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-[#6b7280] bg-white border border-[#e5e7eb]">
          Loading operational metrics from database...
        </div>
      ) : error ? (
        <div className="p-4 border border-black bg-white text-black text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading metrics: {(error as any).message}</span>
        </div>
      ) : data ? (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Amount */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between text-[#6b7280] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Total Sales Amount
                </span>
                <DollarSign className="w-4 h-4 text-black" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-black">
                {formatCurrency(data.sales.totalAmount)}
              </div>
              <div className="mt-2 text-[11px] text-[#6b7280] font-mono">
                {data.sales.count} sales recorded in period
              </div>
            </div>

            {/* Sales Tonnage */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between text-[#6b7280] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Material Sales Tonnage
                </span>
                <Scale className="w-4 h-4 text-black" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-black">
                {formatNumber(data.sales.totalNetWeight)} <span className="text-sm font-normal text-[#6b7280]">Tons</span>
              </div>
              <div className="mt-2 text-[11px] text-[#6b7280] font-mono">
                Net dispatched weight
              </div>
            </div>

            {/* Boulder Tonnage */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between text-[#6b7280] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Boulder Inflow Tonnage
                </span>
                <Layers className="w-4 h-4 text-black" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-black">
                {formatNumber(data.boulders.totalNetWeight)} <span className="text-sm font-normal text-[#6b7280]">Tons</span>
              </div>
              <div className="mt-2 text-[11px] text-[#6b7280] font-mono">
                Quarry intake tonnage
              </div>
            </div>

            {/* Boulder Trip Count */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between text-[#6b7280] mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                  Boulder Trips
                </span>
                <Truck className="w-4 h-4 text-black" />
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-black">
                {data.boulders.count}
              </div>
              <div className="mt-2 text-[11px] text-[#6b7280] font-mono">
                Total vehicle trips verified
              </div>
            </div>
          </div>

          {/* Payment Category Breakdown */}
          <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-4">
              Sales Breakdown by Payment Category
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(data.sales.paymentBreakdown).map(([category, details]) => (
                <div key={category} className="p-3 border border-[#e5e7eb] bg-[#f9fafb]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase text-black font-mono">
                      {category}
                    </span>
                    <span className="text-[10px] text-[#6b7280] font-mono">
                      {details.count} txns
                    </span>
                  </div>
                  <div className="text-base font-bold font-mono text-black">
                    {formatCurrency(details.amount)}
                  </div>
                  <div className="text-[10px] text-[#6b7280] font-mono mt-0.5">
                    {formatNumber(details.netWeight)} Tons
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-[11px] text-[#6b7280] font-mono border-t border-[#e5e7eb] pt-2">
              Note: ACCOUNT transactions represent trade credit receivables and are distinguished from direct collected funds.
            </div>
          </div>

          {/* Recent Activity Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sales */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  Recent Sales Records
                </h3>
                <Link to="/sales" className="text-xs text-black font-semibold hover:underline uppercase text-[11px]">
                  View All Sales &rarr;
                </Link>
              </div>

              {data.recentSales.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#6b7280] border border-dashed border-[#e5e7eb]">
                  No sales recorded for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                        <th className="pb-2">Buyer</th>
                        <th className="pb-2">Vehicle</th>
                        <th className="pb-2 text-right">Net (T)</th>
                        <th className="pb-2 text-right">Amount (₹)</th>
                        <th className="pb-2 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      {data.recentSales.map((s) => (
                        <tr key={s.id} className="hover:bg-[#f9fafb]">
                          <td className="py-2.5 font-medium text-black">{s.buyerName}</td>
                          <td className="py-2.5 font-mono text-[#4b5563]">{s.vehicleNumber}</td>
                          <td className="py-2.5 font-mono text-right">{formatNumber(s.netWeight)}</td>
                          <td className="py-2.5 font-mono text-right font-semibold">{formatNumber(s.amount)}</td>
                          <td className="py-2.5 text-right">
                            <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#f3f4f6] border border-[#e5e7eb] text-black">
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

            {/* Recent Boulder Trips */}
            <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                  Recent Boulder Trips
                </h3>
                <Link to="/boulders" className="text-xs text-black font-semibold hover:underline uppercase text-[11px]">
                  View All Trips &rarr;
                </Link>
              </div>

              {data.recentTrips.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#6b7280] border border-dashed border-[#e5e7eb]">
                  No boulder trips recorded for this period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                        <th className="pb-2">Supplier / Operator</th>
                        <th className="pb-2">Vehicle</th>
                        <th className="pb-2 text-right">Net (T)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f3f4f6]">
                      {data.recentTrips.map((t) => (
                        <tr key={t.id} className="hover:bg-[#f9fafb]">
                          <td className="py-2.5 font-medium text-black">{t.supplierOrOperator}</td>
                          <td className="py-2.5 font-mono text-[#4b5563]">{t.vehicleNumber}</td>
                          <td className="py-2.5 font-mono text-right font-semibold">{formatNumber(t.netWeight)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
