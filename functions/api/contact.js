export async function onRequestPost({ request, env }) {
  const origin = new URL(request.url).origin;
  const done = () => Response.redirect(`${origin}/success`, 303);

  try {
    // Fail loudly if config is missing
    for (const key of ['BREVO_API_KEY', 'BREVO_FROM_EMAIL', 'ADMIN_EMAIL']) {
      if (!env[key]) {
        console.error(`Missing environment variable: ${key}`);
        return new Response('Server configuration error', { status: 500 });
      }
    }

    const formData = await request.formData();
    const name = (formData.get('name') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const phone = (formData.get('phone') || 'Not provided').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    // Honeypot: silently succeed for bots
    if (formData.get('bot-field')) return done();

    if (!name || !email || !message) {
      return new Response('Missing required fields', { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response('Invalid email address', { status: 400 });
    }
    if (name.length > 100 || message.length > 5000) {
      return new Response('Input too long', { status: 400 });
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Ocen Isaac Website', email: env.BREVO_FROM_EMAIL },
        to: [{ email: env.ADMIN_EMAIL, name: 'Ocen Isaac' }],
        replyTo: { email, name },
        subject: `New Project Inquiry from ${name.replace(/[\r\n]/g, ' ')}`,
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
      console.error('Brevo error', brevoResponse.status, await brevoResponse.text());
      return new Response('Email sending failed', { status: 502 });
    }

    return done();
  } catch (err) {
    console.error('Contact function error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}