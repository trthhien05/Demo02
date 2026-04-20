import { useEffect, useState } from 'react';
import * as signalR from '@microsoft/signalr';

export const useSignalR = () => {
    const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

    useEffect(() => {
        // notificationHub request will be proxied via next.config.ts to Render backend
        // Or we use absolute URL if NEXT_PUBLIC_API_URL is set
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        const url = apiBase.endsWith('/api') 
            ? apiBase.replace('/api', '/notificationHub') 
            : (apiBase ? `${apiBase}/notificationHub` : '/notificationHub');

        const newConnection = new signalR.HubConnectionBuilder()
            .withUrl(url)
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);
    }, []);

    useEffect(() => {
        if (connection && connection.state === signalR.HubConnectionState.Disconnected) {
            connection.start()
                .then(() => console.log('✅ SignalR Connected successfully!'))
                .catch(e => console.error('❌ SignalR Connection Error: ', e));
        }

        // Cleanup on unmount
        return () => {
            if (connection && connection.state === signalR.HubConnectionState.Connected) {
                connection.stop();
            }
        };
    }, [connection]);

    return connection;
};
