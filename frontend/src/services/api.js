import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

export const socket = io(SOCKET_URL);

export const api = {
    getEvents: async () => {
        try {
            const response = await axios.get(`${API_URL}/events`);
            return response.data;
        } catch (error) {
            console.error("Error fetching events", error);
            return [];
        }
    },

    getSignals: async () => {
        try {
            const response = await axios.get(`${API_URL}/signal`);
            return response.data;
        } catch (error) {
            console.error("Error fetching signals", error);
            return [];
        }
    },

    resolveEvent: (id) => axios.post(`${API_URL}/events/${id}/resolve`).then(res => res.data),

    bypassEvent: (id) => axios.post(`${API_URL}/events/${id}/bypass`).then(res => res.data),

    sendSignal: async (signalData) => {
        try {
            const response = await axios.post(`${API_URL}/signal`, signalData);
            return response.data;
        } catch (error) {
            console.error("Error sending signal", error);
            throw error;
        }
    },

    sendOfflineSignal: async (signalData) => {
        try {
            const response = await axios.post(`${API_URL}/offline-signal`, signalData);
            return response.data;
        } catch (error) {
            console.error("Error sending offline signal", error);
            throw error;
        }
    },

    getEventCentroids: async (id) => {
        try {
            const response = await axios.get(`${API_URL}/events/${id}/centroids`);
            return response.data;
        } catch (error) {
            console.error("Error fetching centroid history", error);
            return [];
        }
    },

    getEventAdvisories: async (id) => {
        try {
            const response = await axios.get(`${API_URL}/events/${id}/advisories`);
            return response.data;
        } catch (error) {
            console.error("Error fetching advisories", error);
            return [];
        }
    }
};
