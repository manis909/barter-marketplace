import api from './api';

export async function addSkillWishlist(skillListingId) {
  const res = await api.post(`/skill-wishlist/${skillListingId}`);
  return res.data;
}

export async function getSkillWishlist() {
  const res = await api.get('/skill-wishlist');
  return res.data;
}

export async function removeSkillWishlist(skillListingId) {
  const res = await api.delete(`/skill-wishlist/${skillListingId}`);
  return res.data;
}
