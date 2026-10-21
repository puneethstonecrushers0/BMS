import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Calendar, BarChart2, TrendingUp, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  dailyTrends: Array<{
    date: string;
    salesAmount: number;
    salesTonnage: number;
    boulderTonnage: number;
    trips: number;
  }>;
  topBuyersByAmount: Array<{
    buyer: string;
    totalAmount: number;
    totalTonnage: number;
    count: number;
  }>;
  topVehicles: Array<{
    vehicleNumber: string;
    tripCount: number;
    netWeight: number;
  }>;
  paymentDistribution: Record<string, number>;
  totalSalesCount: number;
  totalBoulderTripsCount: number;
}

// Monochrome shades for charts
const MONO_SHADES = ['#111827', '#4b5563', '#9ca3af', '#d1d5db', '#1f2937'];

export const AnalyticsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['detailedAnalytics', startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient<AnalyticsData>(`/analytics/detailed?${params.toString()}`);
    },
  });

  const paymentPieData = data
    ? Object.entries(data.paymentDistribution).map(([name, value]) => ({ name, value }))
    : [];

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;
  const formatTons = (val: number) => `${val.toLocaleString('en-IN')} T`;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white border border-[#e5e7eb] shadow-card rounded-none">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-black flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-black" />
            <span>Operational Trends & Comparative Analytics</span>
          </h2>
          <p className="text-xs text-[#6b7280] font-mono mt-0.5">
            Monochrome trend visualizations based exclusively on verified database transactions
          </p>
        </div>

        {/* Date Selector */}
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
        <div className="p-16 text-center text-xs font-mono text-[#6b7280] bg-white border border-[#e5e7eb]">
          Calculating trend series and aggregations...
        </div>
      ) : error ? (
        <div className="p-4 border border-black bg-white text-black text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading analytics: {(error as any).message}</span>
        </div>
      ) : data ? (
        <>
          {data.totalSalesCount === 0 && data.totalBoulderTripsCount === 0 ? (
            <div className="p-16 text-center bg-white border border-[#e5e7eb] shadow-card">
              <TrendingUp className="w-8 h-8 text-[#9ca3af] mx-auto mb-3" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                No Analytics Data For This Period
              </h3>
              <p className="text-xs font-mono text-[#6b7280] mt-1">
                Zero recorded transactions found within the selected date range. Charts will populate as records are entered.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Chart 1: Sales Amount Daily Trends */}
              <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Daily Sales Revenue Trend (INR)
                  </h3>
                  <p className="text-[11px] font-mono text-[#6b7280]">
                    Aggregated daily billing amount across materials
                  </p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyTrends} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11, fontFamily: 'monospace' }} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales Amount']}
                      />
                      <Line
                        type="monotone"
                        dataKey="salesAmount"
                        stroke="#000000"
                        strokeWidth={2}
                        dot={{ fill: '#000000', r: 3 }}
                        activeDot={{ r: 5 }}
                        name="Daily Sales Amount (₹)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Tonnage Comparison (Boulder Inflow vs Dispatched Sales Material) */}
              <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Tonnage Comparison: Boulder Inflow vs Material Sales (Tons)
                  </h3>
                  <p className="text-[11px] font-mono text-[#6b7280]">
                    Solid black line indicates boulder quarry inflow; dashed gray line indicates outbound material sales
                  </p>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailyTrends} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                      <YAxis stroke="#6b7280" tick={{ fontSize: 11, fontFamily: 'monospace' }} tickFormatter={(v) => `${v}T`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }}
                        formatter={(val: any) => [`${Number(val).toFixed(2)} Tons`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }} />
                      <Line
                        type="monotone"
                        dataKey="boulderTonnage"
                        stroke="#000000"
                        strokeWidth={2}
                        dot={{ fill: '#000000', r: 3 }}
                        name="Boulder Inflow Tonnage"
                      />
                      <Line
                        type="monotone"
                        dataKey="salesTonnage"
                        stroke="#6b7280"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: '#6b7280', r: 3 }}
                        name="Material Sales Tonnage"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Row: Top Buyers & Payment Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Buyers */}
                <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                      Top Buyers By Billing Volume
                    </h3>
                    <p className="text-[11px] font-mono text-[#6b7280]">
                      Leading customer accounts ranked by total sales value
                    </p>
                  </div>
                  {data.topBuyersByAmount.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-[#6b7280]">No buyer data recorded.</div>
                  ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={data.topBuyersByAmount.slice(0, 5)}
                          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                        >
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" stroke="#6b7280" tick={{ fontSize: 10, fontFamily: 'monospace' }} tickFormatter={(v) => `₹${v}`} />
                          <YAxis type="category" dataKey="buyer" stroke="#6b7280" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }}
                            formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Sales Total']}
                          />
                          <Bar dataKey="totalAmount" fill="#111827" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Payment Category Distribution */}
                <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                      Payment Category Distribution (Monochrome)
                    </h3>
                    <p className="text-[11px] font-mono text-[#6b7280]">
                      Proportional sales volume by payment instrument
                    </p>
                  </div>
                  {paymentPieData.every((p) => p.value === 0) ? (
                    <div className="p-8 text-center text-xs font-mono text-[#6b7280]">No payment data recorded.</div>
                  ) : (
                    <div className="h-64 w-full flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            innerRadius={40}
                            stroke="#ffffff"
                            strokeWidth={2}
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {paymentPieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={MONO_SHADES[index % MONO_SHADES.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }}
                            formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Vehicles by Trip Count */}
              <div className="bg-white border border-[#e5e7eb] p-5 shadow-card rounded-none">
                <div className="mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black">
                    Vehicle Trip Frequency & Net Tonnage
                  </h3>
                  <p className="text-[11px] font-mono text-[#6b7280]">
                    Most active haulage vehicles across operations
                  </p>
                </div>
                {data.topVehicles.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-[#6b7280]">No vehicle activity recorded.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] uppercase font-mono text-[#6b7280]">
                          <th className="pb-2">Vehicle Number</th>
                          <th className="pb-2 text-right">Trip Count</th>
                          <th className="pb-2 text-right">Net Weight Dispatched (Tons)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f3f4f6]">
                        {data.topVehicles.map((v) => (
                          <tr key={v.vehicleNumber} className="hover:bg-[#f9fafb]">
                            <td className="py-2.5 font-mono font-medium text-black">{v.vehicleNumber}</td>
                            <td className="py-2.5 font-mono text-right font-semibold">{v.tripCount} trips</td>
                            <td className="py-2.5 font-mono text-right">{v.netWeight.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
