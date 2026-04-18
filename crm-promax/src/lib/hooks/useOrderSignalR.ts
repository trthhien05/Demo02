'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

export function useOrderSignalR() {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5248';
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${backendUrl}/notificationHub`)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connection.on('OrderCreated', (orderId: number, tableNumber: string) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Đơn hàng mới tại Bàn ${tableNumber}!`, {
        icon: '🍳',
        duration: 5000,
      });
      
      // Play sound
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {}); // Ignore interaction blocked errors
      } catch (e) {}
    });

    connection.on('OrderStatusChanged', (orderId: number, status: string) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    connection.on('TableStatusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    });

    connection.on('ReceiveNotification', (user: string, message: string) => {
      toast(message, { icon: '🔔' });
    });

    connection.start()
      .then(() => {
        console.log('SignalR Connected!');
        connectionRef.current = connection;
      })
      .catch(err => console.error('SignalR Connection Error: ', err));

    return () => {
      connection.stop();
    };
  }, [queryClient]);

  return connectionRef.current;
}
