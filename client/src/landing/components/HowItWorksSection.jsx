import { motion } from 'framer-motion';
import { PlusCircle, Inbox, Scale, Lock, MapPin, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'List Item',
    desc: 'Take a quick photo, add condition notes, and publish your item in under 30 seconds.',
    icon: PlusCircle,
    color: '#E07A5F',
  },
  {
    step: '02',
    title: 'Receive Offers',
    desc: 'Interested campus peers propose item swaps directly to your trade inbox.',
    icon: Inbox,
    color: '#D97706',
  },
  {
    step: '03',
    title: 'Choose Best Trade',
    desc: 'Review offered items, compare estimated values, and accept your preferred match.',
    icon: Scale,
    color: '#C8624B',
  },
  {
    step: '04',
    title: 'Chat Securely',
    desc: 'Enter room-isolated, real-time messaging to coordinate swap details.',
    icon: Lock,
    color: '#E07A5F',
  },
  {
    step: '05',
    title: 'Meet on Campus',
    desc: 'Swap safely at standard campus hubs—libraries, dining halls, or quad benches.',
    icon: MapPin,
    color: '#D97706',
  },
  {
    step: '06',
    title: 'Complete Trade',
    desc: 'Confirm the transaction on your phone to build your campus trust rating.',
    icon: CheckCircle2,
    color: '#C8624B',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="lp-section" style={{ background: 'rgba(255, 255, 255, 0.4)' }}>
      <div className="lp-container">
        <div className="lp-center" style={{ marginBottom: 65 }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="lp-badge">Seamless Journey</div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-heading-md"
          >
            How Campus Trading <span className="lp-gradient-text">Works</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            A six-step journey engineered for trust, simplicity, and zero cash friction.
          </motion.p>
        </div>

        {/* 6 Step Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 18,
          }}
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="lp-glass-card"
                style={{ padding: '22px 18px', position: 'relative' }}
              >
                {/* Step Number */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: s.color,
                    marginBottom: 14,
                    letterSpacing: '0.08em',
                  }}
                >
                  STEP {s.step}
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(224, 122, 95, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <Icon size={20} color={s.color} />
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#1C1917' }}>
                  {s.title}
                </h3>

                <p style={{ fontSize: 12.5, color: '#57534E', lineHeight: 1.5, margin: 0 }}>
                  {s.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
