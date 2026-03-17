import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Surface from '../primitives/Surface'

const CASH_FLOW_PERIODS = [
  { key: 'month', label: 'Month' },
  { key: '30d', label: '30D' },
  { key: '60d', label: '60D' },
  { key: '90d', label: '90D' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year', label: 'Year' },
]

function formatCurrency(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '$0'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(numericValue)
}

function RangeButton({ active, label, onClick }) {
  return (
    <button
      className={["button", "button--sm", active ? 'button--primary' : 'button--ghost'].join(' ')}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}

function DashboardVisuals({ agingVisualBuckets, bucketClientBreakdown, cashFlowByPeriod }) {
  const [selectedBucketKey, setSelectedBucketKey] = useState(agingVisualBuckets[0]?.bucketKey ?? null)
  const [activeCashFlowPeriod, setActiveCashFlowPeriod] = useState('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const activeBucketRows = useMemo(() => {
    if (!selectedBucketKey) {
      return []
    }

    return bucketClientBreakdown?.[selectedBucketKey] ?? []
  }, [bucketClientBreakdown, selectedBucketKey])

  const currentBucketLabel = useMemo(() => {
    return agingVisualBuckets.find((bucket) => bucket.bucketKey === selectedBucketKey)?.bucket ?? 'Clients'
  }, [agingVisualBuckets, selectedBucketKey])

  const cashFlowRows = useMemo(() => {
    return cashFlowByPeriod?.[activeCashFlowPeriod] ?? cashFlowByPeriod?.month ?? []
  }, [activeCashFlowPeriod, cashFlowByPeriod])

  const filteredCashFlowRows = useMemo(() => {
    if (!startDate && !endDate) {
      return cashFlowRows
    }

    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null

    return cashFlowRows.filter((item) => {
      const pointDate = item?.date ? new Date(item.date) : null
      if (!pointDate || Number.isNaN(pointDate.getTime())) {
        return true
      }

      if (start && pointDate < start) {
        return false
      }

      if (end && pointDate > end) {
        return false
      }

      return true
    })
  }, [cashFlowRows, startDate, endDate])

  return (
    <section className="section-grid section-grid--visuals">
      <Surface
        className="dashboard-chart-surface"
        eyebrow="Visuals"
        title="Aging Buckets vs Payments"
        description="Click a bucket to drill into client-level payments vs invoice totals."
      >
        <div className="dashboard-chart">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={agingVisualBuckets} barGap={10}>
              <CartesianGrid stroke="rgba(169, 180, 215, 0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fill: '#8794bf', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8794bf', fontSize: 12 }} tickFormatter={formatCurrency} width={82} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 30, 46, 0.96)',
                  border: '1px solid rgba(124, 146, 254, 0.24)',
                  borderRadius: 10,
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar
                dataKey="paymentsReceived"
                fill="#62c8a6"
                name="Payments Received"
                onClick={(payload) => setSelectedBucketKey(payload?.bucketKey ?? null)}
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="totalInvoiceAmount"
                fill="#7c92fe"
                name="Total Invoice Amount"
                onClick={(payload) => setSelectedBucketKey(payload?.bucketKey ?? null)}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="badge-row">
          {agingVisualBuckets.map((bucket) => (
            <RangeButton
              key={bucket.bucketKey}
              active={bucket.bucketKey === selectedBucketKey}
              label={bucket.bucket}
              onClick={() => setSelectedBucketKey(bucket.bucketKey)}
            />
          ))}
        </div>

        <div className="dashboard-chart dashboard-chart--drilldown">
          <h4 className="dashboard-chart-title">{currentBucketLabel} Client Breakdown</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={activeBucketRows} barGap={10}>
              <CartesianGrid stroke="rgba(169, 180, 215, 0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="client" tick={{ fill: '#8794bf', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8794bf', fontSize: 12 }} tickFormatter={formatCurrency} width={82} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 30, 46, 0.96)',
                  border: '1px solid rgba(124, 146, 254, 0.24)',
                  borderRadius: 10,
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="paymentsReceived" fill="#62c8a6" name="Payments Received" radius={[6, 6, 0, 0]} />
              <Bar dataKey="totalInvoiceAmount" fill="#7c92fe" name="Total Invoice Amount" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <Surface
        className="dashboard-chart-surface"
        eyebrow="Visuals"
        title="Cash Flow"
        description="Default month view with period presets and optional date-range filtering."
      >
        <div className="dashboard-chart-controls">
          <div className="dashboard-chart-control-row">
            {CASH_FLOW_PERIODS.map((period) => (
              <RangeButton
                key={period.key}
                active={activeCashFlowPeriod === period.key}
                label={period.label}
                onClick={() => setActiveCashFlowPeriod(period.key)}
              />
            ))}
          </div>

          <div className="dashboard-chart-control-row dashboard-chart-control-row--dates">
            <label className="field-shell">
              <span className="field-label">Start Date</span>
              <input
                className="field-control"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="field-shell">
              <span className="field-label">End Date</span>
              <input
                className="field-control"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="dashboard-chart">
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={filteredCashFlowRows}>
              <CartesianGrid stroke="rgba(169, 180, 215, 0.12)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#8794bf', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8794bf', fontSize: 12 }} tickFormatter={formatCurrency} width={82} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(26, 30, 46, 0.96)',
                  border: '1px solid rgba(124, 146, 254, 0.24)',
                  borderRadius: 10,
                }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="inflow" fill="#62c8a6" name="Inflow" radius={[6, 6, 0, 0]} />
              <Bar dataKey="outflow" fill="#f37a92" name="Outflow" radius={[6, 6, 0, 0]} />
              <Line dataKey="net" stroke="#7c92fe" strokeWidth={3} dot={{ r: 3 }} name="Net" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Surface>
    </section>
  )
}

export default DashboardVisuals