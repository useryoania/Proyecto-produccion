export const getAnalyticsSessionId = () => {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
};

export const trackAnalyticsEvent = async (eventType, eventMetadata = null) => {
    try {
        const sessionId = getAnalyticsSessionId();
        await fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, eventType, eventMetadata })
        });
    } catch (e) {
        console.error('Failed to track event', e);
    }
};

export const submitLeadCapture = async (email, phone, origen = 'web') => {
    try {
        const sessionId = getAnalyticsSessionId();
        const res = await fetch('/api/analytics/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, email, phone, origen })
        });
        const data = await res.json();
        return data.success;
    } catch (e) {
        console.error('Failed to submit lead', e);
        return false;
    }
};
