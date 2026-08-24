import api from './api';

/**
 * Create a booking request for an approved skill application
 */
export async function createSkillProviderRequest(skillApplicationId, preferredDate, preferredTime, teachingMode, message) {
  const res = await api.post('/skill-provider-requests', {
    skill_application_id: skillApplicationId,
    preferred_date: preferredDate,
    preferred_time: preferredTime || null,
    teaching_mode: teachingMode || null,
    message: message || ''
  });
  return res.data;
}

/**
 * Get all booking requests for the current learner
 */
export async function getLearnerRequests() {
  const res = await api.get('/skill-provider-requests/mine');
  return res.data;
}

/**
 * Get all booking requests for the current provider's skills
 */
export async function getProviderRequests() {
  const res = await api.get('/skill-provider-requests/teaching');
  return res.data;
}

/**
 * Get booking requests for a specific skill application (provider only)
 */
export async function getApplicationRequests(skillApplicationId) {
  const res = await api.get(`/skill-provider-requests/${skillApplicationId}`);
  return res.data;
}

/**
 * Accept a booking request
 */
export async function acceptSkillRequest(requestId) {
  const res = await api.put(`/skill-provider-requests/${requestId}/accept`);
  return res.data;
}

/**
 * Reject a booking request
 */
export async function rejectSkillRequest(requestId) {
  const res = await api.put(`/skill-provider-requests/${requestId}/reject`);
  return res.data;
}
