const { sql, getPool } = require('../config/db');

exports.trackEvent = async (req, res) => {
    try {
        const { sessionId, eventType, eventMetadata } = req.body;
        if (!sessionId || !eventType) {
            return res.status(400).json({ error: 'sessionId and eventType are required' });
        }

        const pool = await getPool();
        await pool.request()
            .input('SessionId', sql.VarChar, sessionId)
            .input('EventType', sql.VarChar, eventType)
            .input('EventMetadata', sql.NVarChar, eventMetadata ? JSON.stringify(eventMetadata) : null)
            .query(`
                INSERT INTO LeadAnalyticsEvents (SessionId, EventType, EventMetadata, FechaHora)
                VALUES (@SessionId, @EventType, @EventMetadata, GETDATE())
            `);

        res.status(200).json({ success: true });

        // Emit socket so analytics dashboard refreshes
        const io = req.app.get('socketio');
        if (io) {
            io.emit('analytics:update');
        }

    } catch (error) {
        console.error('Error tracking event:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.submitLead = async (req, res) => {
    try {
        const { sessionId, email, phone, origen } = req.body;
        if (!email || !phone) {
            return res.status(400).json({ error: 'Email and phone are required' });
        }

        const pool = await getPool();
        const result = await pool.request()
            .input('SessionId', sql.VarChar, sessionId || null)
            .input('Email', sql.VarChar, email)
            .input('Celular', sql.VarChar, phone)
            .input('Origen', sql.VarChar, origen || 'web')
            .query(`
                INSERT INTO WebLeads (SessionId, Email, Celular, Origen, EstadoComercial, FechaCreacion, UltimaActualizacion)
                OUTPUT INSERTED.LeadId
                VALUES (@SessionId, @Email, @Celular, @Origen, 'NUEVO', GETDATE(), GETDATE())
            `);

        const newLeadId = result.recordset[0].LeadId;

        // Update any previous events with this sessionId to point to this lead
        if (sessionId) {
            await pool.request()
                .input('SessionId', sql.VarChar, sessionId)
                .input('LeadId', sql.Int, newLeadId)
                .query(`
                    UPDATE LeadAnalyticsEvents
                    SET LeadId = @LeadId
                    WHERE SessionId = @SessionId AND LeadId IS NULL
                `);
        }

        res.status(200).json({ success: true, leadId: newLeadId });

        // Emit socket event to refresh frontend
        const io = req.app.get('socketio');
        if (io) {
            io.emit('leads:update');
        }

    } catch (error) {
        console.error('Error submitting lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getLeads = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT * FROM WebLeads
            ORDER BY FechaCreacion DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const { estadoComercial, notasVentas } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('LeadId', sql.Int, id)
            .input('EstadoComercial', sql.VarChar, estadoComercial)
            .input('NotasVentas', sql.NVarChar, notasVentas)
            .query(`
                UPDATE WebLeads
                SET EstadoComercial = @EstadoComercial,
                    NotasVentas = @NotasVentas,
                    UltimaActualizacion = GETDATE()
                WHERE LeadId = @LeadId
            `);

        res.json({ success: true });

        // Emit socket event to refresh frontend
        const io = req.app.get('socketio');
        if (io) {
            io.emit('leads:update');
        }
        
    } catch (error) {
        console.error('Error updating lead:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getLeadEvents = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getPool();
        const result = await pool.request()
            .input('LeadId', sql.Int, id)
            .query(`
                SELECT * FROM LeadAnalyticsEvents
                WHERE LeadId = @LeadId
                ORDER BY FechaHora ASC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching lead events:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getAnalyticsSummary = async (req, res) => {
    try {
        const pool = await getPool();

        // Conteos por tipo de evento
        const eventsResult = await pool.request().query(`
            SELECT EventType, COUNT(*) AS total
            FROM LeadAnalyticsEvents
            GROUP BY EventType
        `);

        const counts = {};
        eventsResult.recordset.forEach(row => {
            counts[row.EventType] = row.total;
        });

        const modalOpen = counts['MODAL_OPEN'] || 0;
        const formSubmit = counts['FORM_SUBMIT'] || 0;
        const formAbandon = counts['FORM_ABANDON'] || 0;
        const conversionRate = modalOpen > 0 ? ((formSubmit / modalOpen) * 100).toFixed(1) : 0;
        const abandonRate = modalOpen > 0 ? ((formAbandon / modalOpen) * 100).toFixed(1) : 0;

        // Clicks por categoría (CTA_CLICK con metadata JSON)
        const ctaResult = await pool.request().query(`
            SELECT EventMetadata
            FROM LeadAnalyticsEvents
            WHERE EventType = 'CTA_CLICK' AND EventMetadata IS NOT NULL
        `);

        const categoryClicks = {};
        ctaResult.recordset.forEach(row => {
            try {
                const meta = JSON.parse(row.EventMetadata);
                const cat = meta.categoria || meta.category || 'Sin categoría';
                categoryClicks[cat] = (categoryClicks[cat] || 0) + 1;
            } catch (_) {}
        });

        const topCategories = Object.entries(categoryClicks)
            .map(([categoria, clicks]) => ({ categoria, clicks }))
            .sort((a, b) => b.clicks - a.clicks);

        // Total de leads generados
        const leadsResult = await pool.request().query(`SELECT COUNT(*) AS total FROM WebLeads`);
        const totalLeads = leadsResult.recordset[0].total;

        res.json({
            modalOpen,
            formSubmit,
            formAbandon,
            conversionRate: parseFloat(conversionRate),
            abandonRate: parseFloat(abandonRate),
            totalLeads,
            topCategories
        });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
