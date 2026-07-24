import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import realItemsData from '../../data/items.json';

export default function MarketplaceShowcaseSection() {
  const [liked, setLiked] = useState({});

  function toggleLike(id, e) {
    e.stopPropagation();
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <section id="marketplace-preview" className="lp-section">
      <div className="lp-container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 50, flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="lp-badge">
              <Sparkles size={14} color="#E07A5F" />
              <span>Real Marketplace Inventory</span>
            </div>
            <h2 className="lp-heading-md" style={{ margin: 0 }}>
              Live Campus Listings <span className="lp-gradient-text">Ready to Swap</span>
            </h2>
          </div>

          <Link to="/explore" className="lp-btn-secondary" style={{ padding: '10px 22px', fontSize: 14 }}>
            <span>Explore All Items</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Real Marketplace Items Horizontal Scroll Row */}
        <div className="lp-scroll-row">
          {realItemsData.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              style={{
                flex: '0 0 290px',
                background: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(224, 122, 95, 0.15)',
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
                backdropFilter: 'blur(16px)',
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(180, 140, 120, 0.08)',
              }}
              whileHover={{ y: -6, borderColor: 'rgba(224, 122, 95, 0.35)', boxShadow: '0 20px 44px rgba(180, 140, 120, 0.16)' }}
            >
              {/* Image Container */}
              <div style={{ position: 'relative', height: 185, overflow: 'hidden' }}>
                <img
                  src={item.image}
                  alt={item.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                  }}
                />

                {/* Condition Badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#C8624B',
                    border: '1px solid rgba(224, 122, 95, 0.25)',
                  }}
                >
                  {item.condition}
                </div>

                {/* Wishlist Heart Toggle */}
                <button
                  type="button"
                  onClick={e => toggleLike(item.id, e)}
                  aria-label="Add to wishlist"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(224, 122, 95, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <Heart
                    size={16}
                    color={liked[item.id] ? '#C8624B' : '#57534E'}
                    fill={liked[item.id] ? '#C8624B' : 'none'}
                  />
                </button>
              </div>

              {/* Real Item Details */}
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#57534E', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.category}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#D97706', fontWeight: 700 }}>
                    <Star size={12} color="#D97706" fill="#D97706" />
                    <span>{item.ownerRating}</span>
                  </div>
                </div>

                <h4
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#1C1917',
                    margin: '0 0 8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </h4>

                <p
                  style={{
                    fontSize: 12.5,
                    color: '#57534E',
                    margin: '0 0 16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.45,
                    height: 36,
                  }}
                >
                  {item.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(224, 122, 95, 0.1)', paddingTop: 12 }}>
                  <span style={{ fontSize: 12, color: '#57534E', fontWeight: 500 }}>
                    Listed by <strong style={{ color: '#1C1917' }}>{item.ownerName}</strong>
                  </span>

                  <Link
                    to={`/item/${item.id}`}
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#E07A5F',
                      textDecoration: 'none',
                    }}
                  >
                    View Item →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
