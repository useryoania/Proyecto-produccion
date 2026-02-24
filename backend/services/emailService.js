const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

//const FROM_EMAIL = 'User <notificaciones@user.com.uy>';
const FROM_EMAIL = 'User <onboarding@resend.dev>'

exports.sendMail = async (to, subject, html) => {
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html
        });
        if (error) {
            console.error('[Email] Error:', error);
            return false;
        }
        console.log(`[Email] Enviado a ${to}: ${subject}`);
        return true;

    } catch (err) {
        console.error('[Email] Exception:', err.message);
        return false;
    }
};

exports.sendRegistrationMail = async (to, clientName) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin: 0 auto;padding:20px;">
    <h2>¡Bienvenido/a, ${clientName}!</h2>
    <p>Tu cuenta ha sido creada exitosamente.</p>
    <p>Haz clic en el boton para verificar tu correo electronico</p>
    <hr>
    <p style="color: #888; font-size: 12px;" > User - Sistema de Producción</p>
    </div>
    `;
    return this.sendMail(to, "Registro exitoso", html);
};

exports.sendOrderConfirmation = async (to, clientName, orderNumber, orderDetails) => {
    const html = `<div style="font-family:Arial, sans-serif; max-width:600px; margin: 0 auto; padding 20px;">
    <h2>Detalles del pedido</h2>
    <p>Hola ${clientName}, tu pedido <strong>#${orderNumber}</strong> fue recibido.</p>
    <p>${orderDetails || 'Pronto nos pondremos en contacto.'}</p>
    <hr>
    <p style="color: #888; font-size: 12px;">User - Sistema de Producción</p>
    </div>`;
    return this.sendMail(to, `Pedido #${orderNumber} confirmado`, html);
};

exports.sendPasswordResetMail = async (to, resetCode) => {
    const html = `
    <div style="font-family:Arial, sans-serif; max-width:600px; margin 0 auto; padding:20px;>
    <h2> Restablecer contraseña </h2>
    <p>Tu código de verificación es:</p>
    <div style="background: #f0f0f0; padding;20px; text-align:center; font-size:32px; font-weight:bold; letter-spacing:5px; margin:20px 0;">
    ${resetCode}
    </div>
    <p>Este código expira en <strong>15 minutos</strong>.</p>
    <p>Si no solicitaste esto, ignorá este mensaje.</p>
    <hr>
    <p style="color: #888; font-size: 12px;";>User - Sistema de Producción</p>
    </div>
    `;
    return this.sendMail(to, "Código de recuperación de contraseña", html);
};