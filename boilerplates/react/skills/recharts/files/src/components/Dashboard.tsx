import type { CSSProperties } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Sample analytics dashboard wired in by the `recharts` skill.
 *
 * Three canonical chart shapes — line (time series), bar (categorical),
 * area (cumulative) — each wrapped in <ResponsiveContainer> with an
 * EXPLICIT pixel height. Recharts uses SVG and measures its parent; if
 * the parent has no resolved height (e.g. inside a flex column or a grid
 * cell with `auto` rows) the chart collapses to 0px and renders blank.
 * Fix is always: give the container, or its parent, a real height.
 */

const monthlyRevenue = [
  { month: 'Jan', revenue: 12_400 },
  { month: 'Feb', revenue: 13_900 },
  { month: 'Mar', revenue: 15_200 },
  { month: 'Apr', revenue: 14_100 },
  { month: 'May', revenue: 17_800 },
  { month: 'Jun', revenue: 19_500 },
  { month: 'Jul', revenue: 21_300 },
  { month: 'Aug', revenue: 20_100 },
  { month: 'Sep', revenue: 23_400 },
  { month: 'Oct', revenue: 25_800 },
  { month: 'Nov', revenue: 27_200 },
  { month: 'Dec', revenue: 31_600 },
];

const categorySales = [
  { category: 'Hardware', sales: 4200 },
  { category: 'Software', sales: 6800 },
  { category: 'Services', sales: 3100 },
  { category: 'Support', sales: 1900 },
  { category: 'Training', sales: 2400 },
];

// Cumulative user growth — derived once at module load so the AreaChart
// receives a stable referentially-equal array (avoids needless re-animation).
const cumulativeGrowth = monthlyRevenue.reduce<Array<{ month: string; users: number }>>(
  (acc, point, idx) => {
    const prior = idx === 0 ? 0 : (acc[idx - 1]?.users ?? 0);
    acc.push({ month: point.month, users: prior + Math.round(point.revenue / 40) });
    return acc;
  },
  [],
);

const cardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 16,
  marginTop: 24,
  // min-width: 0 is the recharts-in-flex escape hatch; harmless when not in flex.
  minWidth: 0,
};

export function Dashboard(): JSX.Element {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ marginBottom: 8 }}>Dashboard</h2>
      <p style={{ marginTop: 0, color: '#555' }}>
        Sample charts rendered with <code>recharts</code>. Edit{' '}
        <code>src/components/Dashboard.tsx</code> to wire in real data.
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Monthly revenue</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyRevenue} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Sales by category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categorySales} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }} />
            <Legend />
            <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Cumulative user growth</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumulativeGrowth} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="users"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#usersFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
