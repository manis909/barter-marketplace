import { motion } from 'framer-motion';
import { PlusCircle, Search, MessageSquare, MapPin, CheckCircle2 } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'List Item',
    desc: 'Snap a photo, add condition tags, and set an estimated trade value in under 30 seconds.',
    icon: PlusCircle,
    color: '#A855F7',
  },
  {
    step: '02',
    title: 'Find Trade',
    desc: 'Browse items listed by peers on your campus and send a 1-click trade offer proposal.',
    icon: Search,
    color: '#6366F1',
  },
  {
    step: '03',
    title: 'Chat & Confirm',
    desc: 'Once the receiver accepts your offer, instantly enter encrypted real-time chat to plan the swap.',
    icon: MessageSquare,
    color: '#3B82F6',
  },
  {
    step: '04',
    title: 'Campus Meetup',
    desc: 'Meet safely at standard student hubs—libraries, dining halls, or campus centers.',
    icon: MapPin,
    color: '#10B981',
  },
  {
    step: '05',
    title: 'Complete Swap',
    desc: 'Confirm the exchange on your phone to lock the trade status and rate your peer.',
    icon: CheckCircle2,
    color: '#EC4899',
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="lp-section" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
      <div className="lp-container">
        <div className="lp-center" style={{ marginBottom: 70 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
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
            How <span className="lp-gradient-text">Barter</span> Works
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lp-subtext"
          >
            Five simple steps to trade what you have for what you need.
          </motion.p>
        </div>

        {/* Timeline Horizontal Line / Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20,
            position: 'relative',
          }}
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 20,
                  padding: '24px 20px',
                  position: 'relative',
                }}
                whileHover={{ y: -6, borderColor: 'rgba(168, 85, 247, 0.3)' }}
              >
                {/* Step Number Badge */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: s.color,
                    marginBottom: 16,
                    letterSpacing: '0.08em',
                  }}
                >
                  STEP {s.step}
                </div>

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `rgba(${s.color === '#A855F7' ? '168, 85, 247' : s.color === '#6366F1' ? '99, 102, 241' : s.color === '#3B82F6' ? '59, 130, 246' : s.color === '#10B981' ? '16, 185, 129' : '236, 72, 153'}, 0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} color={s.color} />
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#F9FAFB' }}>
                  {s.title}
                </h3>

                <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.5, margin: 0 }}>
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
