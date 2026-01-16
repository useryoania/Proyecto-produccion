import { QueryClient } from '@tanstack/react-query';

// Crear el cliente una sola vez
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false, // Evitar recargas masivas al cambiar de ventana
            retry: 1, // Reintentar solo 1 vez si falla
            staleTime: 1000 * 60 * 5, // Datos "frescos" por 5 minutos (ajustable)
        },
    },
});
