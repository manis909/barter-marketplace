import { motion } from 'framer-motion';
import { BookOpen, Laptop, Music, Gamepad2, Shirt, Dumbbell, Home, Backpack } from 'lucide-react';

const CATEGORIES = [
  { title: 'Textbooks & Books', desc: 'Coursebooks, novels, & guides', icon: BookOpen, color: '#E07A5F' },
  { title: 'Electronics', desc: 'Laptops, headphones, & accessories', icon: Laptop, color: '#C8624B' },
  { title: 'Gaming & Consoles', desc: 'Controllers, games, & gear', icon: Gamepad2, color: '#D97706' },
  { title: 'Fashion & Apparel', desc: 'Jackets, hoodies, & sneakers', icon: Shirt, color: '#E07A5F' },
  { title: 'Dorm & Home Essentials', desc: 'Desk lamps, cookware, & decor', icon: Home, color: '#C8624B' },
  { title: 'Sports & Fitness', desc: 'Rackets, gym weights, & gear', icon: Dumbbell, color: '#D97706' },
  { title: 'Musical Instruments', desc: 'Guitars, keyboards, & pedals', icon: Music, color: '#E07A5F' },
  { title: 'College Gear', desc: 'Bags, mini fridges, & storage', icon: Backpack, color: '#C8624B' },
];

export default function TradeCategoriesSection() {
  return (
    <section id="trade-categories" className="lp-section" style={{ padding: '70px 0', background: 'rgba(255, 255, 255, 0.4)' }}>
      <div className="lp-container">
        {/* Header */}
        <div className="lp-center" style={{ marginBottom: 45 }}>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lp-heading-md"
          >
            What You Can <span className="lp-gradient-text">Trade</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lp-subtext"
          >
            Textbooks, electronics, dorm essentials, or apparel—exchange items you no longer need.
          </motion.p>
        </div>

        {/* 8 Category Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="lp-glass-card"
                style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 11,
                    background: 'rgba(224, 122, 95, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={cat.color} />
                </div>

                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#1C1917' }}>
                    {cat.title}
                  </h3>
                  <p style={{ fontSize: 12, color: '#78716C', margin: 0 }}>
                    {cat.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
