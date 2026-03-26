const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
    try {
        await resend.emails.send({
            from: 'Trendy Store <onboarding@resend.dev>', // මේක මෙහෙමම තියන්න
            to: options.email,
            subject: options.subject,
            html: options.message, // html විදිහට යවන්න
        });
        console.log("Email sent successfully via Resend");
    } catch (error) {
        console.error("Resend Error:", error);
        throw new Error("Email sending failed");
    }
};

module.exports = sendEmail;