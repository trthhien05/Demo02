import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export interface SignalRNotification {
  user: string;
  message: string;
  timestamp: Date;
}

export const useSignalR = (hubUrl: string) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [notifications, setNotifications] = useState<SignalRNotification[]>([]);

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, [hubUrl]);

  useEffect(() => {
    if (connection) {
      connection.start()
        .then(() => {
          console.log('Connected to SignalR Hub!');
          
          connection.on('ReceiveNotification', (user, message) => {
            const newNotification = { user, message, timestamp: new Date() };
            setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep last 5
          });
        })
        .catch(error => console.error('SignalR Connection Error: ', error));

      return () => {
        connection.stop();
      };
    }
  }, [connection]);

  return { notifications, setNotifications };
};
