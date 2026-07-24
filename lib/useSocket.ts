import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return socketRef.current;
}

// Hook for subscribing to task events
export function useTaskEvents(
  onTaskCreated?: (task: any) => void,
  onTaskUpdated?: (task: any) => void,
  onTaskDeleted?: (data: { id: string }) => void
) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    if (onTaskCreated) {
      socket.on('task:created', onTaskCreated);
    }

    if (onTaskUpdated) {
      socket.on('task:updated', onTaskUpdated);
    }

    if (onTaskDeleted) {
      socket.on('task:deleted', onTaskDeleted);
    }

    // Cleanup listeners
    return () => {
      if (onTaskCreated) socket.off('task:created', onTaskCreated);
      if (onTaskUpdated) socket.off('task:updated', onTaskUpdated);
      if (onTaskDeleted) socket.off('task:deleted', onTaskDeleted);
    };
  }, [socket, onTaskCreated, onTaskUpdated, onTaskDeleted]);

  return socket;
}
