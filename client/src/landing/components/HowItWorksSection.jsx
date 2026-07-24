import { motion } from 'framer-motion';
import { PlusCircle, Search, MessageSquare, MapPin } from 'lucide-react';

const STEPS = [
  {
    step: '1',
    title: 'List Your Item',
    desc: 'Snap a photo, add condition details, and list your item for trade.',
    icon: PlusCircle,
  },
  {
    step: '2',
    title: 'Propose a Trade',
    desc: 'Browse campus listings and send a 1-click trade offer.',
    icon: Search,
  },
  {
    step: '3',
    title: 'Chat & Coordinate',
    desc: 'Once accepted, use secure chat to arrange a meetup spot.',
    icon: MessageSquare,
  },
  {
    step: '4',
    title: 'Swap on Campus',
    desc: 'Meet safely at campus hubs and complete the exchange.',
    icon: MapPin,
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="lp-section" style={{ padding: '75px 0', background: 'rgba(255, 255, 255, 0.4)' }}>
      <div className="lp-container">
        <div className="lp-center" style={{ marginBottom: 45 }}>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lp-heading-md"
          >
            How Trading <span className="lp-gradient-text">Works</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-subtext"
          >
            Four simple steps to trade what you have for what you need.
          </motion.p>
        </div>

        {/* 4 Steps Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
          }}
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="lp-glass-card"
                style={{ padding: '24px 20px', position: 'relative' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: 'rgba(224, 122, 95, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={19} color="#E07A5F" />
                  </div>

                  <span style={{ fontSize: 13, fontWeight: 800, color: '#C8624B', opacity: 0.8 }}>
                    0{s.step}
                  </span>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#1C1917' }}>
                  {s.title}
                </h3>

                <p style={{ fontSize: 13, color: '#57534E', lineHeight: 1.5, margin: 0 }}>
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
