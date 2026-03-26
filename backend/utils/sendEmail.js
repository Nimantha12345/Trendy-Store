const sendEmail = async (options) => {
    try {
        // Resend අලුත් නිසා ඒක මේ විදිහට import කරන්න ඕනේ
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        await resend.emails.send({
            from: 'Trendy Store <onboarding@resend.dev>',
            to: options.email,
            subject: options.subject,
            html: options.message,
        });
        
        console.log("Email sent successfully via Resend");
    } catch (error) {
        console.error("Resend Error:", error);
        throw new Error("Email sending failed");
    }
};

module.exports = sendEmail;