const sendEmail = async (options) => {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'Trendy Store <onboarding@resend.dev>',
                to: options.email,
                subject: options.subject,
                html: options.message
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Resend API Error details:", errorData);
            throw new Error("Email sending failed at API");
        }

        console.log("Email sent successfully via Fetch!");
    } catch (error) {
        console.error("Email Fetch Error:", error);
        throw new Error("Email sending failed");
    }
};

module.exports = sendEmail;