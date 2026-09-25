// client/src/pages/MyRentals.jsx — Apple×Duolingo redesign
// Structures: shadcn Card/Badge/Button/Dialog/Separator/Avatar
// Design: Apple restraint (whitespace, muted color, Fraunces headings)
//         + Duolingo delight (timeline animations, press feedback, confetti on completion)
import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PackageCheck,
  CalendarDays,
  MapPin,
  Banknote,
  MessageCircle,
  CreditCard,
  Package,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { getMyRentalBookings } from '../services/rentalBookingService'
import { getDaysUntilDate } from '../utils/helpers'
import RentalTimeline from '../components/RentalTimeline'
import PaymentUploadPanelRental from '../components/PaymentUploadPanelRental'
// Card, CardContent, Badge, Button imported for future use / RentalBookingDetail parity
import { Separator } from '../components/ui/separator.jsx'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar.jsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog.jsx'

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS + ALL CSS
// ─────────────────────────────────────────────────────────────
const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

/* ── Tokens ── */
:root {
  --mr-dark:        #0f3d2e;
  --mr-green:       #1b4d3e;
  --mr-mid:         #2f6b52;
  --mr-lime:        #c6e930;
  --mr-lime-dim:    #d4f04a;
  --mr-cream:       #f8f7f2;
  --mr-paper:       #ffffff;
  --mr-ink:         #10241c;
  --mr-muted:       #7a8c84;
  --mr-line:        rgba(15,61,46,0.09);
  --mr-radius:      20px;
  --mr-shadow-sm:   0 2px 8px rgba(15,61,46,0.06);
  --mr-shadow-md:   0 8px 24px rgba(15,61,46,0.10);
  --mr-shadow-lg:   0 16px 40px rgba(15,61,46,0.13);
}

/* ── Page shell ── */
.mr-page {
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  background: var(--mr-cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--mr-ink);
  -webkit-font-smoothing: antialiased;
}

/* ── Top Header (Apple × Duolingo — airy, clean, no green headboard) ── */
.mr-top-bar {
  padding: 24px 20px 0;
}
@media (min-width: 768px) {
  .mr-top-bar { padding: 32px 36px 0; }
}

/* ── Back button ── */
.mr-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: var(--mr-dark);
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.mr-back:hover {
  background: #f0f4f1;
  border-color: rgba(15,61,46,0.25);
}

/* ── Title card ── */
.mr-title-card {
  background: var(--mr-paper);
  margin: 16px 20px 0;
  border-radius: 24px;
  padding: 28px 24px 24px;
  position: relative;
  z-index: 2;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.05);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}
@media (max-width: 479px) {
  .mr-title-card { flex-direction: column; align-items: stretch; margin: 14px 14px 0; }
}
@media (min-width: 768px) {
  .mr-title-card { margin: 18px 36px 0; padding: 32px 36px 28px; }
}

.mr-title-card h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 16px;
  color: var(--mr-dark);
  display: flex;
  align-items: center;
  gap: 12px;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
@media (min-width: 768px) {
  .mr-title-card h1 { font-size: 34px; }
}

.mr-stats {
  display: flex;
  gap: 32px;
}
.mr-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.mr-stat-num {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 22px;
  font-weight: 600;
  color: var(--mr-dark);
  line-height: 1;
}
.mr-stat-label {
  font-size: 11px;
  color: var(--mr-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
}

/* ── Requests link (lime accent, used ONCE) ── */
.mr-requests-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--mr-dark);
  color: #fff;
  border-radius: 14px;
  padding: 11px 18px;
  font-size: 13.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  flex-shrink: 0;
  align-self: flex-start;
  box-shadow: 0 3px 10px rgba(15,61,46,0.22);
}
.mr-requests-link:hover {
  background: var(--mr-green);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(15,61,46,0.25);
}
@media (max-width: 479px) {
  .mr-requests-link { justify-content: center; align-self: stretch; }
}

.mr-requests-badge {
  background: var(--mr-lime);
  color: var(--mr-dark);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'IBM Plex Mono', monospace;
  min-width: 20px;
  text-align: center;
}

/* ── Segmented control ── */
.mr-seg-wrap {
  margin: 28px 20px 0;
}
@media (min-width: 768px) {
  .mr-seg-wrap { margin: 32px 36px 0; }
}

.mr-seg {
  display: flex;
  background: rgba(15,61,46,0.06);
  border-radius: 16px;
  padding: 5px;
  gap: 4px;
}

.mr-seg-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 12px 0;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: var(--mr-muted);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}
.mr-seg-btn.active {
  background: var(--mr-paper);
  color: var(--mr-dark);
  box-shadow: 0 2px 12px rgba(15,61,46,0.12);
}
.mr-seg-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  opacity: 0.65;
}

/* ── Filter pills ── */
.mr-filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 18px 20px 6px;
  scrollbar-width: none;
}
.mr-filters::-webkit-scrollbar { display: none; }
@media (min-width: 768px) {
  .mr-filters { padding: 20px 36px 8px; }
}

.mr-filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--mr-paper);
  border: 1.5px solid var(--mr-line);
  color: var(--mr-muted);
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
  font-family: 'Inter', sans-serif;
  user-select: none;
  box-shadow: var(--mr-shadow-sm);
}
.mr-filter-pill:hover {
  border-color: rgba(15,61,46,0.3);
  color: var(--mr-dark);
}
.mr-filter-pill.active {
  background: var(--mr-dark);
  border-color: var(--mr-dark);
  color: #fff;
  box-shadow: 0 3px 12px rgba(15,61,46,0.20);
}
.mr-filter-count {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 11px;
  background: rgba(15,61,46,0.10);
  color: var(--mr-dark);
  border-radius: 999px;
  padding: 1px 6px;
  min-width: 20px;
  text-align: center;
}
.mr-filter-pill.active .mr-filter-count {
  background: var(--mr-lime);
  color: var(--mr-dark);
}
.mr-filter-count.urgent {
  background: #fee2e2;
  color: #b91c1c;
}

/* ── Section heading ── */
.mr-section-title {
  margin: 22px 20px 12px;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--mr-muted);
  text-transform: uppercase;
  font-weight: 700;
}
@media (min-width: 768px) {
  .mr-section-title { margin: 26px 36px 14px; }
}

/* ── Cards list ── */
.mr-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 80px;
}
@media (min-width: 768px) {
  .mr-cards { padding: 0 36px 80px; gap: 20px; }
}

/* ── Rental card ── */
.mr-card-wrap {
  background: var(--mr-paper);
  border-radius: 22px;
  box-shadow: var(--mr-shadow-md);
  border: 1px solid var(--mr-line);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.22s cubic-bezier(0.34,1.2,0.64,1), box-shadow 0.22s;
  display: flex;
  flex-direction: column;
  outline: none;
}
.mr-card-wrap:hover {
  transform: translateY(-3px);
  box-shadow: var(--mr-shadow-lg);
}
.mr-card-wrap:active {
  transform: translateY(0);
  box-shadow: var(--mr-shadow-sm);
}
.mr-card-wrap.overdue {
  border-color: #fca5a5;
  box-shadow: 0 4px 18px rgba(220,38,38,0.12);
}
.mr-card-wrap.disputed {
  border-left: 4px solid #ef4444;
}
.mr-card-wrap.completed-card {
  border-color: rgba(198,233,48,0.4);
}

/* Card overdue banner */
.mr-overdue-bar {
  background: #fef2f2;
  color: #b91c1c;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 18px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-bottom: 1px solid #fca5a5;
}

/* Card body */
.mr-card-body {
  display: flex;
  flex-direction: column;
}
@media (min-width: 540px) {
  .mr-card-body { flex-direction: row; }
}

/* Image */
.mr-card-img-wrap {
  position: relative;
  flex-shrink: 0;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: #f0ede6;
}
@media (min-width: 540px) {
  .mr-card-img-wrap {
    width: 148px;
    height: auto;
    min-height: 148px;
    max-height: 240px;
  }
}
.mr-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}
.mr-card-wrap:hover .mr-card-img {
  transform: scale(1.03);
}
.mr-card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mr-muted);
  background: #f0ede6;
}

/* Card content */
.mr-card-content {
  flex: 1;
  padding: 18px 18px 16px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mr-card-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.mr-card-title {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--mr-ink);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
}

/* ── Status badge (inline styles in component) ── */
.mr-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 999px;
  flex-shrink: 0;
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.01em;
}

/* Pulse dot for active */
@keyframes mr-glow-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.55); }
  60%  { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
.mr-pulse-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #10b981;
  animation: mr-glow-pulse 2s infinite;
  display: inline-block;
  flex-shrink: 0;
}

/* ── Meta rows ── */
.mr-meta-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.mr-meta-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--mr-muted);
}
.mr-meta-row strong {
  color: var(--mr-ink);
  font-weight: 600;
}
.mr-meta-icon { flex-shrink: 0; color: var(--mr-mid); }

/* ── Price chips ── */
.mr-chips-row {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.mr-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(15,61,46,0.06);
  color: var(--mr-green);
  font-size: 11.5px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 9px;
  font-family: 'IBM Plex Mono', monospace;
}

/* ── Urgency chips ── */
.mr-urgency {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 7px;
  white-space: nowrap;
}
@keyframes mr-overdue-shake {
  0%,100% { transform: translateX(0); }
  25%      { transform: translateX(-2px); }
  75%      { transform: translateX(2px); }
}

/* ── Rental Timeline (Duolingo delight zone) ── */
.mr-timeline {
  margin: 4px 0 14px;
  padding: 14px 16px;
  background: rgba(15,61,46,0.035);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.mr-tl-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--mr-muted);
  text-transform: uppercase;
  margin-bottom: 12px;
}
.mr-tl-steps {
  display: flex;
  align-items: center;
  gap: 0;
  position: relative;
}
.mr-tl-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
  position: relative;
  z-index: 1;
}
.mr-tl-connector {
  height: 3px;
  flex: 1;
  border-radius: 3px;
  background: rgba(15,61,46,0.12);
  transition: background 0.5s ease, transform 0.3s ease;
  align-self: flex-start;
  margin-top: 13px;
  margin-bottom: 14px;
}
.mr-tl-connector.done {
  background: var(--mr-dark);
}
.mr-tl-connector.partial {
  background: linear-gradient(to right, var(--mr-dark) 50%, rgba(15,61,46,0.12) 50%);
}

/* Step circle — this is the Duolingo moment */
@keyframes mr-check-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.25); opacity: 1; }
  80%  { transform: scale(0.92); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes mr-ring-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(15,61,46, 0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(15,61,46, 0); }
  100% { box-shadow: 0 0 0 0 rgba(15,61,46, 0); }
}
.mr-tl-circle {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px;
  border: 2.5px solid rgba(15,61,46,0.14);
  background: var(--mr-paper);
  color: var(--mr-muted);
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  position: relative;
}
.mr-tl-circle.done {
  background: var(--mr-dark);
  border-color: var(--mr-dark);
  color: var(--mr-lime);
  animation: mr-check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) both,
             mr-ring-pulse 0.8s 0.4s ease-out;
}
.mr-tl-circle.current {
  background: var(--mr-paper);
  border-color: var(--mr-dark);
  border-width: 2.5px;
  color: var(--mr-dark);
  animation: mr-ring-pulse 2s infinite;
}
.mr-tl-step-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--mr-muted);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
}
.mr-tl-step-label.done { color: var(--mr-dark); }
.mr-tl-step-label.current { color: var(--mr-dark); font-weight: 700; }

/* ── Action buttons (Duolingo press) ── */
@keyframes mr-btn-press {
  0%   { transform: scale(1); }
  40%  { transform: scale(0.94); }
  70%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}
.mr-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--mr-line);
}
.mr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 40px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: 'Inter', sans-serif;
  transition: background 0.18s, box-shadow 0.18s;
  text-decoration: none;
  position: relative;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.mr-btn:focus-visible {
  outline: 3px solid var(--mr-lime);
  outline-offset: 2px;
}
.mr-btn:active:not(:disabled) {
  animation: mr-btn-press 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.mr-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.mr-btn-primary {
  background: var(--mr-dark);
  color: #fff;
  box-shadow: 0 2px 8px rgba(15,61,46,0.22);
}
.mr-btn-primary:hover:not(:disabled) {
  background: var(--mr-green);
  box-shadow: 0 4px 14px rgba(15,61,46,0.28);
}

.mr-btn-lime {
  background: var(--mr-lime);
  color: var(--mr-dark);
  box-shadow: 0 2px 8px rgba(198,233,48,0.35);
}
.mr-btn-lime:hover:not(:disabled) {
  background: var(--mr-lime-dim);
  box-shadow: 0 4px 14px rgba(198,233,48,0.45);
}

.mr-btn-ghost {
  background: rgba(15,61,46,0.06);
  color: var(--mr-dark);
}
.mr-btn-ghost:hover:not(:disabled) { background: rgba(15,61,46,0.11); }

.mr-confirmed-text {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: #15803d;
  font-weight: 600;
}

/* ── Payment panel wrap ── */
.mr-pay-panel-wrap { margin-top: 14px; }

/* ── Completion glow (Duolingo reward moment) ── */
@keyframes mr-completion-glow {
  0%   { box-shadow: 0 0 0 0 rgba(198,233,48,0); }
  20%  { box-shadow: 0 0 0 10px rgba(198,233,48,0.35); }
  60%  { box-shadow: 0 0 0 20px rgba(198,233,48,0.12); }
  100% { box-shadow: 0 0 0 0 rgba(198,233,48,0); }
}
.mr-card-wrap.just-completed {
  animation: mr-completion-glow 1.6s ease-out;
}

/* ── Confetti canvas ── */
.mr-confetti-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  pointer-events: none;
  z-index: 9999;
}

/* ── Empty state ── */
.mr-empty {
  text-align: center;
  padding: 60px 24px;
  background: var(--mr-paper);
  border-radius: 22px;
  border: 1.5px dashed var(--mr-line);
  margin: 0 20px 80px;
  color: var(--mr-muted);
  box-shadow: var(--mr-shadow-sm);
}
@media (min-width: 768px) {
  .mr-empty { margin: 0 36px 80px; }
}
.mr-empty p {
  font-size: 14.5px;
  margin: 14px 0 0;
  max-width: 340px;
  margin-inline: auto;
  line-height: 1.7;
  color: var(--mr-muted);
}

/* ── Loading / Error ── */
.mr-loading {
  padding: 64px 24px;
  text-align: center;
  color: var(--mr-muted);
  font-size: 14.5px;
}

/* ── Payment guide inside card ── */
.mr-pay-guide {
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
  border-radius: 14px;
  padding: 13px 15px;
  margin-top: 8px;
  font-size: 12.5px;
  color: #166534;
  line-height: 1.6;
}
.mr-pay-guide-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mr-pay-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  counter-reset: pay-step;
}
.mr-pay-steps li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  counter-increment: pay-step;
}
.mr-pay-steps li::before {
  content: counter(pay-step);
  background: var(--mr-dark);
  color: var(--mr-lime);
  border-radius: 50%;
  width: 18px; height: 18px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px;
  font-weight: 700;
  margin-top: 1px;
}

/* ── Confirm dialog ── */
.mr-dialog-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px; height: 52px;
  border-radius: 50%;
  background: rgba(15,61,46,0.08);
  margin: 0 auto 12px;
}

/* ── Responsive tweaks ── */
@media (max-width: 399px) {
  .mr-chips-row { display: none; }
}
`

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending', icon: 'clock' },
  accepted: { bg: '#dbeafe', color: '#1d4ed8', label: 'Payment Required', icon: 'credit' },
  accepted_pv: { bg: '#fef3c7', color: '#92400e', label: 'Pending Verification', icon: 'clock' },
  accepted_paid: { bg: '#d1fae5', color: '#065f46', label: 'Awaiting Pickup', icon: 'check' },
  active: { bg: '#d1fae5', color: '#065f46', label: 'Active', icon: 'pulse' },
  return_pending: { bg: '#fef3c7', color: '#b45309', label: 'Return Pending', icon: 'clock' },
  completed: { bg: '#f0fdf4', color: '#15803d', label: 'Completed', icon: 'check' },
  declined: { bg: '#fee2e2', color: '#b91c1c', label: 'Declined', icon: 'alert' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled', icon: null },
  disputed: { bg: '#fee2e2', color: '#b91c1c', label: 'Disputed', icon: 'alert' },
}

function resolveStatus(status, paymentStatus) {
  if (status === 'accepted') {
    if (paymentStatus === 'paid' || paymentStatus === 'verified') return 'accepted_paid'
    if (paymentStatus === 'pending_verification') return 'accepted_pv'
    return 'accepted'
  }
  return status
}

function StatusBadge({ status, paymentStatus, overdue }) {
  const resolved = resolveStatus(status, paymentStatus)
  const cfg = STATUS_CFG[resolved] || { bg: '#f1f5f9', color: '#475569', label: resolved, icon: null }
  const bg = overdue ? '#fee2e2' : cfg.bg
  const color = overdue ? '#b91c1c' : cfg.color
  const label = overdue ? 'Overdue' : cfg.label
  const icon = overdue ? 'alert' : cfg.icon

  return (
    <span className="mr-status-badge" style={{ background: bg, color }}>
      {icon === 'pulse' && <span className="mr-pulse-dot" />}
      {icon === 'alert' && <AlertTriangle size={11} />}
      {icon === 'check' && <CheckCircle2 size={11} />}
      {icon === 'clock' && <Clock size={11} />}
      {icon === 'credit' && <CreditCard size={11} />}
      {label}
    </span>
  )
}

function getRentalUrgency(rental) {
  if (!rental?.end_datetime) return null
  if (!['active', 'return_pending', 'accepted'].includes(rental.status)) return null
  const now = new Date()
  const end = new Date(rental.end_datetime)
  if (isNaN(end.getTime())) return null
  const diffDays = Math.ceil((end - now) / 86400000)
  if (diffDays < 0) return {
    type: 'overdue',
    label: Math.abs(diffDays) === 1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(diffDays)} days`,
    cls: 'mr-urgency',
    style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' },
    isOverdue: true,
  }
  if (diffDays === 0) return {
    type: 'due_today',
    label: 'Due today',
    cls: 'mr-urgency',
    style: { background: '#fee2e2', color: '#b91c1c' },
    isOverdue: false,
  }
  if (diffDays <= 1) return {
    type: 'due_soon',
    label: 'Due tomorrow',
    cls: 'mr-urgency',
    style: { background: '#fef3c7', color: '#b45309' },
    isOverdue: false,
  }
  if (diffDays <= 3) return {
    type: 'due_soon',
    label: `${diffDays} days left`,
    cls: 'mr-urgency',
    style: { background: '#fef3c7', color: '#b45309' },
    isOverdue: false,
  }
  return {
    type: 'normal',
    label: `${diffDays} days left`,
    cls: 'mr-urgency',
    style: { background: 'rgba(15,61,46,0.07)', color: 'var(--mr-mid)' },
    isOverdue: false,
  }
}

function requiresAction(rental, role) {
  const iAmRenter = role === 'renting'
  if (rental.status === 'accepted' && iAmRenter && rental.payment_status !== 'verified') return true
  if (rental.status === 'accepted') {
    const myPickup = iAmRenter ? rental.borrower_confirmed_pickup : rental.owner_confirmed_pickup
    if (!myPickup) return true
  }
  if (['active', 'return_pending'].includes(rental.status)) {
    const myReturn = iAmRenter
      ? (rental.borrower_confirmed_return ?? rental.renter_confirmed_return)
      : rental.owner_confirmed_return
    if (!myReturn) return true
  }
  if (getRentalUrgency(rental)?.isOverdue) return true
  if (rental.status === 'disputed') return true
  return false
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}



// ─────────────────────────────────────────────────────────────
// CONFETTI (tiny, self-contained — only fires on Completed)
// ─────────────────────────────────────────────────────────────
function Confetti({ active, onDone }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const COLORS = ['#c6e930', '#0f3d2e', '#fff', '#4ade80', '#fbbf24']
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      w: 7 + Math.random() * 8,
      h: 3 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 1,
    }))

    let frame = 0
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      pieces.forEach(p => {
        if (p.y > canvas.height + 20) return
        alive = true
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotV
        p.vy += 0.08 // gravity
        if (frame > 50) p.alpha = Math.max(0, p.alpha - 0.012)
        ctx.save()
        ctx.globalAlpha = p.alpha
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })
      frame++
      if (alive && frame < 160) {
        rafRef.current = requestAnimationFrame(draw)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onDone?.()
      }
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="mr-confetti-canvas" />
}

// ─────────────────────────────────────────────────────────────
// PAYMENT GUIDE (inline, under the pay button)
// ─────────────────────────────────────────────────────────────
function PaymentGuide({ rental }) {
  const fee = Number(rental.agreed_total_amount || 0)
  const deposit = Number(rental.deposit_amount || 0)
  const total = fee + deposit

  return (
    <div className="mr-pay-guide">
      <div className="mr-pay-guide-title">
        <CreditCard size={14} /> How to Pay
      </div>
      <ol className="mr-pay-steps">
        <li>Tap <strong>"Pay Now"</strong> to open the UPI QR code below</li>
        <li>Scan with GPay, PhonePe, Paytm or any UPI app</li>
        <li>Pay <strong>₹{total.toLocaleString('en-IN')}</strong> (₹{fee.toLocaleString('en-IN')} fee + ₹{deposit.toLocaleString('en-IN')} refundable deposit)</li>
        <li>Enter your UTR / transaction ID and upload the screenshot</li>
        <li>Admin verifies and activates your rental — usually within a few hours</li>
      </ol>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RENTAL CARD
// ─────────────────────────────────────────────────────────────
function RentalCard({
  rental, role,
  showPayPanelId, onTogglePayPanel,
  onConfirmPickup, onConfirmReturn,
  confirmingId, navigate,
  onPaymentSuccess,
  onConfirmDialog,
}) {
  const urgency = getRentalUrgency(rental)
  const overdue = Boolean(rental.is_overdue || urgency?.isOverdue)
  const iAmRenter = role === 'renting'
  const isDisputed = rental.status === 'disputed'
  const isCompleted = rental.status === 'completed'

  const myPickup = iAmRenter ? rental.borrower_confirmed_pickup : rental.owner_confirmed_pickup
  const theirPickup = iAmRenter ? rental.owner_confirmed_pickup : rental.borrower_confirmed_pickup
  const daysUntilStart = getDaysUntilDate(rental.start_datetime)
  const isPickupDateReached = daysUntilStart <= 0
  const canConfirmPickup = rental.status === 'accepted' && !myPickup && isPickupDateReached
  const isAwaitingPickupDate = rental.status === 'accepted' && !myPickup && !isPickupDateReached

  const myReturn = iAmRenter
    ? (rental.borrower_confirmed_return ?? rental.renter_confirmed_return)
    : rental.owner_confirmed_return
  const theirReturn = iAmRenter
    ? rental.owner_confirmed_return
    : (rental.borrower_confirmed_return ?? rental.renter_confirmed_return)
  const daysUntilEnd = getDaysUntilDate(rental.end_datetime)
  const isReturnDateReached = daysUntilEnd <= 0
  const canConfirmReturn = ['active', 'return_pending'].includes(rental.status) && !myReturn && isReturnDateReached
  const isAwaitingReturnDate = ['active', 'return_pending'].includes(rental.status) && !myReturn && !isReturnDateReached

  const payPanelOpen = showPayPanelId === rental.id
  const imageUrl = rental.item_image_urls?.[0] || null
  const otherName = rental.other_party_name ||
    rental.other_party_username ||
    (iAmRenter ? (rental.owner_name || rental.owner_username) : (rental.borrower_name || rental.borrower_username)) ||
    'Unknown'
  const otherAvatar = rental.other_party_avatar || (iAmRenter ? rental.owner_profile_image : rental.borrower_profile_image)

  const cardClass = [
    'mr-card-wrap',
    overdue ? 'overdue' : '',
    isDisputed ? 'disputed' : '',
    isCompleted ? 'completed-card' : '',
  ].filter(Boolean).join(' ')

  const needsPayment = rental.status === 'accepted' && iAmRenter &&
    rental.payment_status !== 'verified' &&
    rental.payment_status !== 'paid' &&
    rental.payment_status !== 'pending_verification'

  return (
    <div
      className={cardClass}
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/renter/booking/${rental.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          navigate(`/renter/booking/${rental.id}`)
        }
      }}
    >
      {/* Overdue banner */}
      {overdue && (
        <div className="mr-overdue-bar">
          <AlertTriangle size={13} />
          {urgency?.label
            ? `Rental ${urgency.label.toLowerCase()} — please arrange a return immediately.`
            : 'Overdue — please arrange a return immediately.'}
        </div>
      )}

      <div className="mr-card-body">
        {/* Image */}
        <div className="mr-card-img-wrap">
          {imageUrl
            ? <img className="mr-card-img" src={imageUrl} alt={rental.item_name || 'Item'} />
            : (
              <div className="mr-card-img-placeholder">
                <Package size={38} />
              </div>
            )
          }
        </div>

        {/* Content */}
        <div className="mr-card-content">

          {/* Title row */}
          <div className="mr-card-top-row">
            <h3 className="mr-card-title">{rental.item_name || 'Rental item'}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {urgency && (
                <span className={urgency.cls} style={urgency.style}>
                  {urgency.isOverdue ? '⚠ ' : '⏱ '}{urgency.label}
                </span>
              )}
              <StatusBadge status={rental.status} paymentStatus={rental.payment_status} overdue={overdue} />
            </div>
          </div>

          {/* Timeline */}
          <RentalTimeline rental={rental} role={role} />

          {/* Other party */}
          <div className="mr-meta-rows">
            <div className="mr-meta-row">
              <Avatar size="sm" style={{ width: 22, height: 22, flexShrink: 0 }}>
                <AvatarImage src={otherAvatar} />
                <AvatarFallback style={{ fontSize: 9, background: 'rgba(15,61,46,0.08)', color: 'var(--mr-dark)' }}>
                  {initials(otherName)}
                </AvatarFallback>
              </Avatar>
              <span>
                {iAmRenter ? 'From' : 'To'}: <strong>{otherName}</strong>
              </span>
            </div>

            <div className="mr-meta-row">
              <span className="mr-meta-icon"><CalendarDays size={13} /></span>
              <span>
                {formatDate(rental.start_datetime)}
                {rental.end_datetime && <> → {formatDate(rental.end_datetime)}</>}
              </span>
            </div>

            {rental.meeting_location && (
              <div className="mr-meta-row">
                <span className="mr-meta-icon"><MapPin size={13} /></span>
                <span>{rental.meeting_location}</span>
              </div>
            )}
          </div>

          {/* Price chips */}
          <div className="mr-chips-row">
            <span className="mr-chip">
              <Banknote size={11} /> ₹{Number(rental.agreed_total_amount || 0).toLocaleString('en-IN')} fee
            </span>
            <span className="mr-chip">
              🔒 ₹{Number(rental.deposit_amount || 0).toLocaleString('en-IN')} deposit
            </span>
          </div>

          {/* Payment guide (only when payment needed) */}
          {needsPayment && !payPanelOpen && (
            <PaymentGuide rental={rental} />
          )}

          {/* Completed reward message */}
          {isCompleted && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f0fdf4', borderRadius: 12, padding: '10px 14px',
              marginBottom: 10, border: '1px solid #bbf7d0',
            }}>
              <Sparkles size={16} color="#15803d" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                Rental complete! Deposit will be refunded shortly.
              </span>
            </div>
          )}

          {/* ── Action row (stops card-click) ── */}
          <div className="mr-action-row" onClick={(e) => e.stopPropagation()}>

            {/* Pay button */}
            {needsPayment && (
              <button
                type="button"
                className="mr-btn mr-btn-lime"
                onClick={(e) => { e.stopPropagation(); onTogglePayPanel(rental.id) }}
              >
                <CreditCard size={14} />
                {payPanelOpen ? 'Hide Payment' : 'Pay Now'}
              </button>
            )}

            {/* Pickup button */}
            {rental.status === 'accepted' && (
              canConfirmPickup ? (
                <button
                  type="button"
                  className="mr-btn mr-btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfirmDialog({
                      type: 'pickup',
                      id: rental.id,
                      title: 'Confirm Pickup',
                      description: `Confirm that you have ${iAmRenter ? 'received' : 'handed over'} the item "${rental.item_name}"?`,
                    })
                  }}
                  disabled={confirmingId === rental.id}
                >
                  <PackageCheck size={14} />
                  {confirmingId === rental.id ? 'Confirming…' : 'Confirm Pickup'}
                </button>
              ) : isAwaitingPickupDate ? (
                <span className="mr-confirmed-text" style={{ color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <Clock size={13} /> Starts in {daysUntilStart} {daysUntilStart === 1 ? 'day' : 'days'}
                </span>
              ) : (
                <span className="mr-confirmed-text">
                  <CheckCircle2 size={14} /> Pickup confirmed
                </span>
              )
            )}

            {theirPickup && rental.status === 'accepted' && (
              <span className="mr-confirmed-text" style={{ fontSize: 12, color: 'var(--mr-muted)' }}>
                <CheckCircle2 size={13} /> {iAmRenter ? 'Owner' : 'Renter'} confirmed
              </span>
            )}

            {/* Return button */}
            {['active', 'return_pending'].includes(rental.status) && (
              canConfirmReturn ? (
                <button
                  type="button"
                  className="mr-btn mr-btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    onConfirmDialog({
                      type: 'return',
                      id: rental.id,
                      title: 'Confirm Return',
                      description: `Confirm that the item "${rental.item_name}" has been ${iAmRenter ? 'returned to the owner' : 'received back from the renter'}?`,
                    })
                  }}
                  disabled={confirmingId === rental.id}
                >
                  <PackageCheck size={14} />
                  {confirmingId === rental.id ? 'Confirming…' : 'Confirm Return'}
                </button>
              ) : isAwaitingReturnDate ? (
                <span className="mr-confirmed-text" style={{ color: '#b45309', background: '#fef3c7', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                  <Clock size={13} /> {daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'} left until return
                </span>
              ) : (
                <span className="mr-confirmed-text">
                  <CheckCircle2 size={14} /> Return confirmed
                </span>
              )
            )}

            {theirReturn && ['active', 'return_pending'].includes(rental.status) && (
              <span className="mr-confirmed-text" style={{ fontSize: 12, color: 'var(--mr-muted)' }}>
                <CheckCircle2 size={13} /> {iAmRenter ? 'Owner' : 'Renter'} confirmed
              </span>
            )}

            {/* Chat */}
            {['pending', 'accepted', 'active', 'return_pending', 'completed', 'disputed'].includes(rental.status) && (
              <button
                type="button"
                className="mr-btn mr-btn-ghost"
                style={{ marginLeft: 'auto' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/rental/chat/${rental.id}`) }}
              >
                <MessageCircle size={14} /> Chat
              </button>
            )}
          </div>

          {/* Payment panel */}
          {payPanelOpen && (
            <div className="mr-pay-panel-wrap" onClick={(e) => e.stopPropagation()}>
              <PaymentUploadPanelRental
                request={rental}
                onSuccess={() => onPaymentSuccess(rental.id)}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CONFIRM DIALOG
// ─────────────────────────────────────────────────────────────
function ConfirmDialog({ open, onOpenChange, data, onConfirm, loading }) {
  if (!data) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mr-dialog-icon">
            <PackageCheck size={24} color="var(--mr-dark)" />
          </div>
          <DialogTitle style={{ textAlign: 'center', fontFamily: 'Fraunces, serif', fontSize: 20 }}>
            {data.title}
          </DialogTitle>
          <DialogDescription style={{ textAlign: 'center', lineHeight: 1.6 }}>
            {data.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter style={{ gap: 8 }}>
          <button
            type="button"
            className="mr-btn mr-btn-ghost"
            onClick={() => onOpenChange(false)}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="mr-btn mr-btn-primary"
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Confirming…' : 'Yes, confirm'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function MyRentals() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState('renting')
  const [filter, setFilter] = useState('all')
  const [data, setData] = useState({ renting: [], owned: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)
  const [showPayPanelId, setShowPayPanel] = useState(null)

  // Confirm dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogData, setDialogData] = useState(null)

  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false)

  // ── Load data ──
  const load = useCallback(async () => {
    try {
      const res = await getMyRentalBookings()
      const bookings = res.bookings || []
      const prevCompleted = data.renting.filter(b => b.status === 'completed').map(b => b.id)
      const newRenting = bookings.filter(b => b.borrower_id === currentUser?.id)
      const newCompleted = newRenting.filter(b => b.status === 'completed').map(b => b.id)
      // Check if any rental just became completed
      const justDone = newCompleted.some(id => !prevCompleted.includes(id))
      if (justDone) setShowConfetti(true)

      setData({
        renting: newRenting,
        owned: bookings.filter(b => b.owner_id === currentUser?.id),
      })
    } catch {
      setError('Unable to load your rentals right now.')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (currentUser?.id) load()
  }, [currentUser?.id])

  // ── Handlers ──
  function handleTogglePayPanel(id) {
    setShowPayPanel(prev => prev === id ? null : id)
  }

  function handlePaymentSuccess(bookingId) {
    // Optimistically update payment_status so the Pay button disappears immediately
    setData(prev => ({
      renting: prev.renting.map(b =>
        b.id === bookingId ? { ...b, payment_status: 'pending_verification' } : b
      ),
      owned: prev.owned.map(b =>
        b.id === bookingId ? { ...b, payment_status: 'pending_verification' } : b
      ),
    }))
    setShowPayPanel(null)
    load()
  }

  function handleConfirmDialog(dialogInfo) {
    setDialogData(dialogInfo)
    setDialogOpen(true)
  }

  async function handleConfirmAction() {
    if (!dialogData) return
    setConfirmingId(dialogData.id)
    try {
      if (dialogData.type === 'pickup') {
        await api.post(`/rental-bookings/${dialogData.id}/confirm-pickup`)
      } else {
        await api.post(`/rental-bookings/${dialogData.id}/confirm-return`)
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed — please try again.')
    } finally {
      setConfirmingId(null)
    }
  }

  // ── Derived lists ──
  const list = tab === 'renting' ? data.renting : data.owned
  const pendingCount = data.owned.filter(r => r.status === 'pending').length
  const actionList = list.filter(r => requiresAction(r, tab))
  const activeList = list.filter(r => ['active', 'return_pending'].includes(r.status))
  const completedList = list.filter(r => ['completed', 'cancelled', 'declined'].includes(r.status))
  const filteredList =
    filter === 'action' ? actionList :
      filter === 'active' ? activeList :
        filter === 'completed' ? completedList :
          list

  const FILTERS = [
    { key: 'all', label: 'All', count: list.length, urgent: false },
    { key: 'action', label: 'Needs Action', count: actionList.length, urgent: actionList.length > 0 },
    { key: 'active', label: 'Active', count: activeList.length, urgent: false },
    { key: 'completed', label: 'Completed', count: completedList.length, urgent: false },
  ]

  return (
    <div className="mr-page">
      <style>{PAGE_CSS}</style>

      {/* Confetti */}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={dialogData}
        onConfirm={handleConfirmAction}
        loading={Boolean(confirmingId)}
      />

      {/* ── Top Bar ── */}
      <div className="mr-top-bar">
        <Link to="/renter" className="mr-back">
          <ArrowLeft size={14} /> Back to Rentals
        </Link>
      </div>

      {/* ── Title card ── */}
      <div className="mr-title-card">
        <div>
          <h1>
            <KeyRound size={28} color="var(--mr-dark)" strokeWidth={2} />
            My Rentals
          </h1>
          <div className="mr-stats">
            <div className="mr-stat">
              <span className="mr-stat-num">{data.renting.length}</span>
              <span className="mr-stat-label">Renting</span>
            </div>
            <Separator orientation="vertical" style={{ height: 32, margin: '4px 0' }} />
            <div className="mr-stat">
              <span className="mr-stat-num">{data.owned.length}</span>
              <span className="mr-stat-label">Items out</span>
            </div>
          </div>
        </div>

        <Link to="/renter/requests" className="mr-requests-link">
          Incoming requests
          {pendingCount > 0 && (
            <span className="mr-requests-badge">{pendingCount}</span>
          )}
          <ChevronRight size={15} />
        </Link>
      </div>

      {/* ── Segmented control ── */}
      <div className="mr-seg-wrap">
        <div className="mr-seg">
          {[
            { key: 'renting', label: 'Renting', count: data.renting.length },
            { key: 'owned', label: 'My Items Out', count: data.owned.length },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              className={`mr-seg-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); setFilter('all') }}
            >
              {t.label}
              <span className="mr-seg-count">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="mr-filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            className={`mr-filter-pill ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className={`mr-filter-count ${f.urgent && filter !== f.key ? 'urgent' : ''}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="mr-loading">Loading your rentals…</div>
      ) : error ? (
        <div className="mr-loading" style={{ color: '#dc2626' }}>{error}</div>
      ) : list.length === 0 ? (
        <div className="mr-empty">
          <KeyRound size={40} color="var(--mr-muted)" />
          <p>
            {tab === 'renting'
              ? "You're not renting anything yet. Browse Explore and find items marked 'Request to Rent'."
              : 'None of your items are currently rented out.'}
          </p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="mr-empty">
          <CheckCircle2 size={40} color="var(--mr-mid)" />
          <p>
            {filter === 'action'
              ? "No rentals need your attention right now — you're all caught up."
              : filter === 'active'
                ? 'No active rentals in this tab.'
                : 'No completed rentals yet.'}
          </p>
          <button
            type="button"
            className="mr-btn mr-btn-ghost"
            style={{ marginTop: 18, display: 'inline-flex' }}
            onClick={() => setFilter('all')}
          >
            View all rentals
          </button>
        </div>
      ) : (
        <>
          <div className="mr-section-title">
            {tab === 'renting' ? "Items you're renting" : 'Your items currently out'}
            {filter !== 'all' && ` · ${filter === 'action' ? 'Needs Action' : filter === 'active' ? 'Active' : 'Completed'}`}
          </div>
          <div className="mr-cards">
            {filteredList.map(r => (
              <RentalCard
                key={r.id}
                rental={r}
                role={tab}
                showPayPanelId={showPayPanelId}
                onTogglePayPanel={handleTogglePayPanel}
                onConfirmPickup={() => { }}
                onConfirmReturn={() => { }}
                confirmingId={confirmingId}
                navigate={navigate}
                onPaymentSuccess={handlePaymentSuccess}
                onConfirmDialog={handleConfirmDialog}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}