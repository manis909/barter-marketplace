import { motion } from 'framer-motion';

const STATS = [
  { label: 'Items Recycled', value: '10,000+', color: '#E07A5F' },
  { label: 'Successful Swaps', value: '2,500+', color: '#C8624B' },
  { label: 'Active Campuses', value: '150+', color: '#D97706' },
  { label: 'Saved by Students', value: '$120k+', color: '#E07A5F' },
];

export default function CommunityStatsSection() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 246, 240, 0.95) 100%)',
            border: '1px solid rgba(224, 122, 95, 0.18)',
            borderRadius: 32,
            padding: '55px 32px',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 20px 50px rgba(180, 140, 120, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 36,
              textAlign: 'center',
            }}
          >
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
              >
                <div
                  style={{
                    fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.025em',
                    marginBottom: 8,
                    background: `linear-gradient(135deg, #1C1917 30%, ${stat.color} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: '#57534E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
