'use client';

import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useOrderSignalR(
  onEvent?: (event: string, ...args: any[]) => void,
  groupToJoin?: string
) {
  const queryClient = useQueryClient();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
    // SignalR Hub is at /notificationHub, usually API_BASE ends with /api
    const hubUrl = API_BASE.replace(/\/api$/, '') + '/notificationHub';
    
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl || '/notificationHub')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('OrderCreated', (orderId: number, tableNumber: string) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Đơn hàng mới tại Bàn ${tableNumber}!`, {
        description: "Bếp đã nhận được yêu cầu.",
        duration: 5000,
      });
      
      onEvent?.('OrderCreated', orderId, tableNumber);
      
      // Play sound
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });

    connection.on('OrderStatusChanged', (orderId: number, status: string) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      onEvent?.('OrderStatusChanged', orderId, status);
    });

    connection.on('TableStatusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      onEvent?.('TableStatusChanged');
    });

    connection.on('ReceiveNotification', (user: string, message: string) => {
      toast.info(message, { 
        description: `Từ: ${user}`
      });
      onEvent?.('ReceiveNotification', user, message);
    });

    connection.start()
      .then(async () => {
        console.log('✅ SignalR Connected!');
        connectionRef.current = connection;
        
        if (groupToJoin) {
          try {
            await connection.invoke('JoinGroup', groupToJoin);
            console.log(`👥 Joined group: ${groupToJoin}`);
          } catch (e) {
            console.error(`❌ Failed to join group ${groupToJoin}:`, e);
          }
        }
      })
      .catch(err => {
        // Chỉ hiện lỗi nếu không phải là lỗi do React StrictMode ngắt kết nối
        if (err.name !== 'AbortError' && !err.message?.includes('stopped during negotiation')) {
          console.error('❌ SignalR Connection Error: ', err);
        }
      });

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.stop();
      }
    };
  }, [queryClient]);

  return connectionRef.current;
}
