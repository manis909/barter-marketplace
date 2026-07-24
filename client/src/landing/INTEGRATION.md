# Redesigned Apple/Stripe-Tier Landing Page Integration

The entire Landing Page feature has been redesigned **100% in isolation** inside `client/src/landing/` adhering strictly to **zero-conflict team constraints**.

---

## 🎨 New Visual Identity & Craftsmanship

- **Color Palette:** Sunset Peach (`#F39A77`), Warm Orange (`#E07A5F`), Soft Gold (`#E6B87D`), Soft Cream (`#FFF8F0`), Ivory White (`#FDFBF7`), and Warm Charcoal (`#121110`).
- **Apple Liquid Glass:** Subtle transparency, delicate warm borders, 20px-32px radii, realistic soft ambient shadows.
- **Real Inventory Integration:** Showcase section pulls live inventory from `client/src/data/items.json`.
- **Educational Category Section:** New *"What Can You Trade?"* category showcase.

---

## 🛠️ How to Enable in `App.jsx`

When the team member responsible for `App.jsx` and routing is ready to enable the Landing Page, add these two lines to [client/src/App.jsx](file:///c:/Users/HP/barter-marketplace-1/client/src/App.jsx):

```javascript
// Step 1: Add import
import LandingPage from './landing/LandingPage';

// Step 2: Add Route inside <Routes>
<Route path="/" element={<LandingPage />} />
<Route path="/landing" element={<LandingPage />} />
```
