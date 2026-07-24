import './LandingPage.css';
import LandingNavbar from './components/LandingNavbar';
import HeroSection from './components/HeroSection';
import TradeCategoriesSection from './components/TradeCategoriesSection';
import MarketplaceShowcaseSection from './components/MarketplaceShowcaseSection';
import HowItWorksSection from './components/HowItWorksSection';
import FinalCTASection from './components/FinalCTASection';
import LandingFooter from './components/LandingFooter';

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* Soft Background Orbs */}
      <div className="lp-ambient-orb lp-orb-1" />
      <div className="lp-ambient-orb lp-orb-2" />

      {/* Navigation */}
      <LandingNavbar />

      {/* Main Content */}
      <main>
        <HeroSection />
        <TradeCategoriesSection />
        <MarketplaceShowcaseSection />
        <HowItWorksSection />
        <FinalCTASection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
