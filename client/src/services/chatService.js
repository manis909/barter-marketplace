import api from './api';

export async function getHiddenChatIds() {
  const res = await api.get('/chat/hidden/mine');
  return res.data;
}

export async function deleteChatForMe(tradeOfferId) {
  const res = await api.delete(`/chat/${tradeOfferId}/for-me`);
  return res.data;
}

export async function deleteChatForEveryone(tradeOfferId) {
  const res = await api.delete(`/chat/${tradeOfferId}/for-everyone`);
  return res.data;
}