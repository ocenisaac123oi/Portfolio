export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const name = formData.get('name');
    const email = formData.get('email');
    const phone = formData.get('phone') || 'Not provided';
    const message = formData.get('message');
    const honeypot = formData.get('bot-field');

    // Honeypot — if filled, it's a bot. Silently succeed.
    if (honeypot) {
      return Response.redirect(new URL('/success.html', request.url), 303);
    }

    // Validate required fields
    if (!name || !email || !message) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response('Invalid email address', { status: 400 });
    }

    // Send via Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Ocen Isaac Website',
          email: 'ocenisaac256oi@gmail.com',
        },
        to: [
          {
            email: 'ocenisaac256oi@gmail.com',
            name: 'Ocen Isaac',
          },
        ],
        replyTo: {
          email: email,
          name: name,
        },
        subject: `New Project Inquiry from ${name}`,
        htmlContent: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
          <p><strong>Message:</strong></p>
          <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('Brevo API error:', errorText);
      return new Response('Email sending failed', { status: 500 });
    }

    // Redirect to success page
    return Response.redirect(new URL('/success.html', request.url), 303);

  } catch (error) {
    console.error('Contact function error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

// Basic HTML escaping to prevent injection in emails
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}