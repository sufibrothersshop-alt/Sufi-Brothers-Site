const TONE_CLASSES = {
  gold: 'bg-secondary text-secondary-foreground',
  red: 'bg-primary text-primary-foreground',
  plain: 'border border-border bg-card text-foreground',
} as const

export function StatTile({ label, value, tone = 'gold' }: { label: string; value: string; tone?: keyof typeof TONE_CLASSES }) {
  return (
    <div className={`rounded-2xl p-5 ${TONE_CLASSES[tone]}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-serif text-2xl font-black">{value}</p>
    </div>
  )
}
