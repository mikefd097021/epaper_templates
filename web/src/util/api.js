import React, { useMemo } from 'react'
import axios from "axios";
import { ConcurrencyManager } from "axios-concurrency";
import useWebSocket from 'react-use-websocket';
import { API_BASE_URL, WS_URL } from '../config';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`
});

export const useEpaperWebsocket = () => {
  const options = useMemo(() => ({
    shouldReconnect: (closeEvent) => true
  }), []);

  return useWebSocket(`${WS_URL}/socket`, options);
}

ConcurrencyManager(api, 1);

export default api;