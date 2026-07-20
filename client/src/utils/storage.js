// client/src/utils/storage.js
//
// Centralized localStorage access. Nobody should call
// localStorage.getItem/setItem directly in a component — go through
// these functions instead, so if we ever change storage strategy
// (e.g. move to cookies), it's one file to update, not every file
// that touches auth.

import { STORAGE_KEYS } from './constants';

export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setToken(token) {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
}

export function isLoggedIn() {
  return !!getToken();
}