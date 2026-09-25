import api from './api';

export async function addRentalWishlist(rentalListingId) {
  const res = await api.post(`/rental-wishlist/${rentalListingId}`);
  return res.data;
}

export async function getRentalWishlist() {
  const res = await api.get('/rental-wishlist');
  return res.data;
}

export async function getRentalWishlistIds() {
  const res = await api.get('/rental-wishlist/ids');
  return res.data;
}

export async function removeRentalWishlist(rentalListingId) {
  const res = await api.delete(`/rental-wishlist/${rentalListingId}`);
  return res.data;
}
