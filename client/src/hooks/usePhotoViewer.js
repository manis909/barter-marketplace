import { useState, useRef } from 'react';

// Shared WhatsApp-style full-screen photo viewer logic — tap to open,
// swipe down to dismiss. Used by Barter/Skilter/Rental profile pages so
// the behavior only needs to be written once.
const SWIPE_CLOSE_THRESHOLD = 100;

export default function usePhotoViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);

  function openViewer() {
    setIsOpen(true);
  }

  function closeViewer() {
    setIsOpen(false);
  }

  function handleTouchStart(e) {
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function handleTouchMove(e) {
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  }

  function handleTouchEnd() {
    setDragging(false);
    if (dragY > SWIPE_CLOSE_THRESHOLD) {
      setIsOpen(false);
    }
    setDragY(0);
  }

  return {
    isOpen,
    openViewer,
    closeViewer,
    dragY,
    dragging,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}